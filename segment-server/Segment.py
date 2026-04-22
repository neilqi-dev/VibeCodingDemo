import os
import uuid
import time
import hashlib
import sqlite3
import json
from typing import List, Dict
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel

# --- 1. 初始化与配置 ---
app = FastAPI(title="High-Precision Audio Segmenter with Cache")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "segments_cache.db"
MODEL_SIZE = "base.en"
model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8", cpu_threads=8)

# --- 2. 数据库操作逻辑 ---

def init_db():
    """初始化 SQLite 数据库"""
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS audio_cache (
                file_hash TEXT PRIMARY KEY,
                language TEXT,
                segments_json TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
    print("SQLite 数据库初始化完成")

init_db()

def get_cached_result(file_hash: str):
    """从数据库查询缓存"""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.execute(
            "SELECT language, segments_json FROM audio_cache WHERE file_hash = ?", 
            (file_hash,)
        )
        row = cursor.fetchone()
        if row:
            return {"language": row[0], "segments": json.loads(row[1])}
    return None

def save_to_cache(file_hash: str, language: str, segments: List[Dict]):
    """将结果存入数据库"""
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT OR REPLACE INTO audio_cache (file_hash, language, segments_json) VALUES (?, ?, ?)",
            (file_hash, language, json.dumps(segments))
        )

def calculate_md5(content: bytes) -> str:
    """计算文件二进制流的 MD5"""
    return hashlib.md5(content).hexdigest()

# --- 3. 核心算法 (保持高精度逻辑) ---

def process_with_word_level_precision(segments_gen) -> List[Dict]:
    final_sentences = []
    current_sentence_words = []
    sentence_endings = ('.', '!', '?')

    for segment in segments_gen:
        if not segment.words: continue
        for word in segment.words:
            current_sentence_words.append(word)
            clean_word = word.word.strip()
            if clean_word.endswith(sentence_endings):
                text = "".join([w.word for w in current_sentence_words]).strip()
                final_sentences.append({
                    "text": text,
                    "start": round(current_sentence_words[0].start, 2),
                    "end": round(current_sentence_words[-1].end, 2)
                })
                current_sentence_words = []
    
    if current_sentence_words:
        text = "".join([w.word for w in current_sentence_words]).strip()
        final_sentences.append({
            "text": text,
            "start": round(current_sentence_words[0].start, 2),
            "end": round(current_sentence_words[-1].end, 2)
        })
    return final_sentences

# --- 4. API 接口 ---

@app.post("/v1/segment")
async def segment_audio(file: UploadFile = File(...)):
    content = await file.read()
    
    # 第一步：计算 MD5 并检查缓存
    file_hash = calculate_md5(content)
    cached_data = get_cached_result(file_hash)
    
    if cached_data:
        print(f"命中缓存: {file_hash}")
        return {
            "success": True,
            "cached": True,
            "language": cached_data["language"],
            "segments": cached_data["segments"]
        }

    # 第二步：未命中缓存，执行拆分逻辑
    temp_file = f"temp_{uuid.uuid4()}.tmp"
    try:
        with open(temp_file, "wb") as f:
            f.write(content)

        start_perf = time.perf_counter()
        
        segments_gen, info = model.transcribe(
            temp_file,
            language="en",
            beam_size=1,
            word_timestamps=True,
            vad_filter=True,
            initial_prompt="Professional business English. Use standard punctuation."
        )

        final_data = process_with_word_level_precision(segments_gen)

        # 第三步：保存到本地数据库
        save_to_cache(file_hash, info.language, final_data)

        return {
            "success": True,
            "cached": False,
            "language": info.language,
            "duration": time.perf_counter() - start_perf,
            "segments": final_data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_file):
            os.remove(temp_file)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9000)