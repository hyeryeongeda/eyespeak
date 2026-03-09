"""
LLM 서비스 - GMS/템플릿 자동 전환
환경변수 USE_GMS=true면 GMS GPT-4o-mini, 아니면 템플릿 반환
"""
import os
from dotenv import load_dotenv

load_dotenv()

USE_GMS = os.getenv("USE_GMS", "false").lower() == "true"

if USE_GMS:
    # GMS 버전
    from openai import OpenAI

    client = OpenAI(
        api_key=os.getenv("GMS_KEY"),
        base_url="https://gms.ssafy.io/gmsapi/api.openai.com/v1"
    )

    def refine_with_llm(caregiver_stt: str, top_candidates: list) -> list:
        prompt = f"""
보호자 질문: {caregiver_stt}
환자 과거 표현: {chr(10).join(f"- {c}" for c in top_candidates)}

위를 참고하여 답변 4개 생성 (반말, 15자 이내):
1.
2.
3.
4.
"""
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "ALS 환자 답변 생성 전문가"},
                {"role": "user", "content": prompt}
            ],
            max_tokens=100,
            temperature=0.7
        )

        content = response.choices[0].message.content
        lines = content.strip().split('\n')
        answers = []
        for line in lines:
            if line and (line[0].isdigit() or line.startswith('-')):
                answer = line.split('.', 1)[-1].strip() if '.' in line else line.strip('- ')
                answers.append(answer)

        return answers[:4]

else:
    # 템플릿 버전 (로컬, API 불필요)
    def refine_with_llm(caregiver_stt: str, top_candidates: list) -> list:
        """상위 후보를 그대로 반환 (LLM 미사용)"""
        fallback = ["응", "그래", "좋아"]
        if len(top_candidates) >= 4:
            return top_candidates[:4]
        return top_candidates + fallback[:4 - len(top_candidates)]
