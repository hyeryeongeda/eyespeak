-- ============================================================
-- 시연 질문 관련 expressions 보강 (matching_id = 1)
-- ============================================================

-- ============================================================
-- 시연 1: 오렌지 주스 마실래?
-- ============================================================
-- 긍정 (10개)
INSERT IGNORE INTO expressions (matching_id, content, sentiment, category, created_at) VALUES
(1, '오렌지 주스 좋아', 'POSITIVE', '음식', NOW()),
(1, '오렌지 주스 마실래', 'POSITIVE', '음식', NOW()),
(1, '주스 마시고 싶어', 'POSITIVE', '음식', NOW()),
(1, '오렌지 주스 시원하게 줘', 'POSITIVE', '음식', NOW()),
(1, '주스 좋아', 'POSITIVE', '음식', NOW()),
(1, '응 주스 줘', 'POSITIVE', '음식', NOW()),
(1, '주스 마실게', 'POSITIVE', '음식', NOW()),
(1, '오렌지 맛있어', 'POSITIVE', '음식', NOW()),
(1, '주스 한 잔 줘', 'POSITIVE', '음식', NOW()),
(1, '응 마실래', 'POSITIVE', '음식', NOW());
-- 부정 (10개)
INSERT IGNORE INTO expressions (matching_id, content, sentiment, category, created_at) VALUES
(1, '주스 안 마실래', 'NEGATIVE', '음식', NOW()),
(1, '지금은 안 마실래', 'NEGATIVE', '음식', NOW()),
(1, '나중에 마실게', 'NEGATIVE', '음식', NOW()),
(1, '주스 싫어', 'NEGATIVE', '음식', NOW()),
(1, '안 마시고 싶어', 'NEGATIVE', '음식', NOW()),
(1, '다른 거 줘', 'NEGATIVE', '음식', NOW()),
(1, '물 줘', 'NEGATIVE', '음식', NOW()),
(1, '목 안 말라', 'NEGATIVE', '음식', NOW()),
(1, '됐어', 'NEGATIVE', '음식', NOW()),
(1, '주스 말고', 'NEGATIVE', '음식', NOW());
-- 중립 (10개)
INSERT IGNORE INTO expressions (matching_id, content, sentiment, category, created_at) VALUES
(1, '다른 거 마실래', 'NEUTRAL', '음식', NOW()),
(1, '뭐가 있어?', 'NEUTRAL', '음식', NOW()),
(1, '잠깐만', 'NEUTRAL', '일상', NOW()),
(1, '조금 이따가', 'NEUTRAL', '일상', NOW()),
(1, '글쎄', 'NEUTRAL', '일상', NOW()),
(1, '뭐 마시지', 'NEUTRAL', '음식', NOW()),
(1, '우유는?', 'NEUTRAL', '음식', NOW()),
(1, '생각 중이야', 'NEUTRAL', '일상', NOW()),
(1, '아직 모르겠어', 'NEUTRAL', '일상', NOW()),
(1, '좀 있다가', 'NEUTRAL', '일상', NOW());

-- ============================================================
-- 시연 2: 손녀딸이 보고싶대. 놀러오라고 할까?
-- ============================================================
-- 긍정 (10개)
INSERT IGNORE INTO expressions (matching_id, content, sentiment, category, created_at) VALUES
(1, '예승이 빨리 왔으면', 'POSITIVE', '가족', NOW()),
(1, '예승이 보러 가고 싶어', 'POSITIVE', '가족', NOW()),
(1, '예승이 안아주고 싶어', 'POSITIVE', '가족', NOW()),
(1, '예승이 놀러 오면 좋겠다', 'POSITIVE', '가족', NOW()),
(1, '예승이 기다릴게', 'POSITIVE', '가족', NOW()),
(1, '응 불러줘', 'POSITIVE', '욕구', NOW()),
(1, '응 보고 싶어', 'POSITIVE', '가족', NOW()),
(1, '예승이 오늘 올 수 있어?', 'POSITIVE', '가족', NOW()),
(1, '빨리 보고 싶다', 'POSITIVE', '가족', NOW()),
(1, '예승이 데리고 와줘', 'POSITIVE', '가족', NOW());
-- 부정 (10개)
INSERT IGNORE INTO expressions (matching_id, content, sentiment, category, created_at) VALUES
(1, '오늘은 힘들어', 'NEGATIVE', '감정', NOW()),
(1, '다음에 오라고 해', 'NEGATIVE', '가족', NOW()),
(1, '지금은 안 됐으면', 'NEGATIVE', '감정', NOW()),
(1, '컨디션이 안 좋아', 'NEGATIVE', '건강', NOW()),
(1, '나중에 불러줘', 'NEGATIVE', '가족', NOW()),
(1, '오늘은 쉬고 싶어', 'NEGATIVE', '감정', NOW()),
(1, '아파서 못 만나', 'NEGATIVE', '건강', NOW()),
(1, '다음 주에 오라고 해', 'NEGATIVE', '가족', NOW()),
(1, '좀 쉬어야 해', 'NEGATIVE', '건강', NOW()),
(1, '아직 준비 안 됐어', 'NEGATIVE', '일상', NOW());
-- 중립 (10개)
INSERT IGNORE INTO expressions (matching_id, content, sentiment, category, created_at) VALUES
(1, '예승이 뭐 하고 있대?', 'NEUTRAL', '가족', NOW()),
(1, '예승이 학교는?', 'NEUTRAL', '가족', NOW()),
(1, '언제 올 수 있대?', 'NEUTRAL', '가족', NOW()),
(1, '예승이 건강해?', 'NEUTRAL', '가족', NOW()),
(1, '몇 시에 와?', 'NEUTRAL', '일상', NOW()),
(1, '뭐 가져올 거야?', 'NEUTRAL', '일상', NOW()),
(1, '예승이 키 많이 컸어?', 'NEUTRAL', '가족', NOW()),
(1, '예승이 잘 지내?', 'NEUTRAL', '가족', NOW()),
(1, '모르겠어', 'NEUTRAL', '일상', NOW()),
(1, '생각해볼게', 'NEUTRAL', '일상', NOW());

-- ============================================================
-- 시연 3: 알겠어. 손녀 줄 간식 만들러 주방에 잠시 갈게.
-- ============================================================
-- 긍정 (10개)
INSERT IGNORE INTO expressions (matching_id, content, sentiment, category, created_at) VALUES
(1, '맛있는 거 만들어줘', 'POSITIVE', '음식', NOW()),
(1, '간식 기다릴게', 'POSITIVE', '음식', NOW()),
(1, '빨리 와', 'POSITIVE', '감정', NOW()),
(1, '조심해', 'POSITIVE', '감정', NOW()),
(1, '고생해', 'POSITIVE', '감정', NOW()),
(1, '맛있게 만들어', 'POSITIVE', '음식', NOW()),
(1, '예승이 좋아하겠다', 'POSITIVE', '가족', NOW()),
(1, '간식 뭐야?', 'POSITIVE', '음식', NOW()),
(1, '잘 다녀와', 'POSITIVE', '감정', NOW()),
(1, '기다리고 있을게', 'POSITIVE', '감정', NOW());
-- 부정 (10개)
INSERT IGNORE INTO expressions (matching_id, content, sentiment, category, created_at) VALUES
(1, '가지 마', 'NEGATIVE', '감정', NOW()),
(1, '옆에 있어줘', 'NEGATIVE', '감정', NOW()),
(1, '혼자 있기 싫어', 'NEGATIVE', '감정', NOW()),
(1, '금방 와', 'NEGATIVE', '감정', NOW()),
(1, '오래 가지 마', 'NEGATIVE', '감정', NOW()),
(1, '빨리 돌아와', 'NEGATIVE', '감정', NOW()),
(1, '심심할 것 같아', 'NEGATIVE', '감정', NOW()),
(1, '나도 같이 가고 싶어', 'NEGATIVE', '감정', NOW()),
(1, '외로워', 'NEGATIVE', '감정', NOW()),
(1, '혼자 무서워', 'NEGATIVE', '감정', NOW());
-- 중립 (10개)
INSERT IGNORE INTO expressions (matching_id, content, sentiment, category, created_at) VALUES
(1, '알겠어', 'NEUTRAL', '일상', NOW()),
(1, '뭐 만들어?', 'NEUTRAL', '일상', NOW()),
(1, '얼마나 걸려?', 'NEUTRAL', '일상', NOW()),
(1, '그래', 'NEUTRAL', '일상', NOW()),
(1, 'TV 틀어줘', 'NEUTRAL', '일상', NOW()),
(1, '리모컨 줘', 'NEUTRAL', '일상', NOW()),
(1, '응', 'NEUTRAL', '일상', NOW()),
(1, '나 뭐 하고 있을까', 'NEUTRAL', '일상', NOW()),
(1, '주방 조심해', 'NEUTRAL', '일상', NOW()),
(1, '다녀와', 'NEUTRAL', '일상', NOW());

-- ============================================================
-- 시연 4: 혹시 먹고 싶은 거 있어?
-- ============================================================
-- 긍정 (10개)
INSERT IGNORE INTO expressions (matching_id, content, sentiment, category, created_at) VALUES
(1, '계란죽 먹고 싶어', 'POSITIVE', '음식', NOW()),
(1, '국밥 먹고 싶어', 'POSITIVE', '음식', NOW()),
(1, '미역국 먹고 싶어', 'POSITIVE', '음식', NOW()),
(1, '참기름죽 해줘', 'POSITIVE', '음식', NOW()),
(1, '된장찌개 먹고 싶어', 'POSITIVE', '음식', NOW()),
(1, '김치찌개 먹을래', 'POSITIVE', '음식', NOW()),
(1, '죽 먹고 싶어', 'POSITIVE', '음식', NOW()),
(1, '따뜻한 거 먹고 싶어', 'POSITIVE', '음식', NOW()),
(1, '부드러운 거 먹고 싶어', 'POSITIVE', '음식', NOW()),
(1, '국물 있는 거 해줘', 'POSITIVE', '음식', NOW());
-- 부정 (10개)
INSERT IGNORE INTO expressions (matching_id, content, sentiment, category, created_at) VALUES
(1, '배 안 고파', 'NEGATIVE', '음식', NOW()),
(1, '나중에 먹을래', 'NEGATIVE', '음식', NOW()),
(1, '아직 안 먹고 싶어', 'NEGATIVE', '음식', NOW()),
(1, '입맛 없어', 'NEGATIVE', '음식', NOW()),
(1, '먹기 싫어', 'NEGATIVE', '음식', NOW()),
(1, '속이 안 좋아', 'NEGATIVE', '건강', NOW()),
(1, '안 먹을래', 'NEGATIVE', '음식', NOW()),
(1, '지금은 됐어', 'NEGATIVE', '음식', NOW()),
(1, '좀 있다가 먹을게', 'NEGATIVE', '음식', NOW()),
(1, '밥 생각 없어', 'NEGATIVE', '음식', NOW());
-- 중립 (10개)
INSERT IGNORE INTO expressions (matching_id, content, sentiment, category, created_at) VALUES
(1, '아무거나 해줘', 'NEUTRAL', '음식', NOW()),
(1, '뭐가 있어?', 'NEUTRAL', '음식', NOW()),
(1, '뭐 해줄 수 있어?', 'NEUTRAL', '음식', NOW()),
(1, '메뉴 뭐야?', 'NEUTRAL', '음식', NOW()),
(1, '골라줘', 'NEUTRAL', '음식', NOW()),
(1, '뭐든 좋아', 'NEUTRAL', '음식', NOW()),
(1, '네가 정해', 'NEUTRAL', '음식', NOW()),
(1, '간단한 거', 'NEUTRAL', '음식', NOW()),
(1, '생각해볼게', 'NEUTRAL', '일상', NOW()),
(1, '뭐 먹지', 'NEUTRAL', '음식', NOW());

-- ============================================================
-- 추가 테스트 1: 오늘 어때?
-- ============================================================
-- 긍정 (10개)
INSERT IGNORE INTO expressions (matching_id, content, sentiment, category, created_at) VALUES
(1, '오늘 좀 나아', 'POSITIVE', '감정', NOW()),
(1, '컨디션 괜찮아', 'POSITIVE', '감정', NOW()),
(1, '기분 좋아', 'POSITIVE', '감정', NOW()),
(1, '오늘은 좋은 날이야', 'POSITIVE', '감정', NOW()),
(1, '좀 나아진 것 같아', 'POSITIVE', '감정', NOW()),
(1, '괜찮아', 'POSITIVE', '감정', NOW()),
(1, '오늘은 힘 있어', 'POSITIVE', '감정', NOW()),
(1, '잠을 잘 잤어', 'POSITIVE', '감정', NOW()),
(1, '기분이 좋아', 'POSITIVE', '감정', NOW()),
(1, '몸이 가벼워', 'POSITIVE', '감정', NOW());
-- 부정 (10개)
INSERT IGNORE INTO expressions (matching_id, content, sentiment, category, created_at) VALUES
(1, '오늘 힘들어', 'NEGATIVE', '감정', NOW()),
(1, '컨디션 안 좋아', 'NEGATIVE', '감정', NOW()),
(1, '좀 피곤해', 'NEGATIVE', '감정', NOW()),
(1, '어깨가 아파', 'NEGATIVE', '통증', NOW()),
(1, '잠을 못 잤어', 'NEGATIVE', '감정', NOW()),
(1, '몸이 무거워', 'NEGATIVE', '감정', NOW()),
(1, '기분이 별로야', 'NEGATIVE', '감정', NOW()),
(1, '오늘은 안 좋아', 'NEGATIVE', '감정', NOW()),
(1, '힘이 없어', 'NEGATIVE', '감정', NOW()),
(1, '지쳤어', 'NEGATIVE', '감정', NOW());
-- 중립 (10개)
INSERT IGNORE INTO expressions (matching_id, content, sentiment, category, created_at) VALUES
(1, '그냥 그래', 'NEUTRAL', '감정', NOW()),
(1, '별일 없어', 'NEUTRAL', '일상', NOW()),
(1, '평소랑 비슷해', 'NEUTRAL', '감정', NOW()),
(1, '보통이야', 'NEUTRAL', '감정', NOW()),
(1, '그저 그래', 'NEUTRAL', '감정', NOW()),
(1, '뭐 특별한 건 없어', 'NEUTRAL', '일상', NOW()),
(1, '어제랑 같아', 'NEUTRAL', '감정', NOW()),
(1, '잘 모르겠어', 'NEUTRAL', '일상', NOW()),
(1, '그냥 있어', 'NEUTRAL', '일상', NOW()),
(1, '뭐 그렇지', 'NEUTRAL', '감정', NOW());

-- ============================================================
-- 추가 테스트 2: 밥 먹었어?
-- ============================================================
-- 긍정 (10개)
INSERT IGNORE INTO expressions (matching_id, content, sentiment, category, created_at) VALUES
(1, '응 먹었어', 'POSITIVE', '음식', NOW()),
(1, '아까 먹었어', 'POSITIVE', '음식', NOW()),
(1, '죽 먹었어', 'POSITIVE', '음식', NOW()),
(1, '맛있게 먹었어', 'POSITIVE', '음식', NOW()),
(1, '잘 먹었어', 'POSITIVE', '음식', NOW()),
(1, '다 먹었어', 'POSITIVE', '음식', NOW()),
(1, '배불러', 'POSITIVE', '음식', NOW()),
(1, '조금 먹었어', 'POSITIVE', '음식', NOW()),
(1, '응', 'POSITIVE', '일상', NOW()),
(1, '먹었어', 'POSITIVE', '음식', NOW());
-- 부정 (10개)
INSERT IGNORE INTO expressions (matching_id, content, sentiment, category, created_at) VALUES
(1, '아직 안 먹었어', 'NEGATIVE', '음식', NOW()),
(1, '밥 안 먹었어', 'NEGATIVE', '음식', NOW()),
(1, '배고파', 'NEGATIVE', '음식', NOW()),
(1, '먹고 싶은데 못 먹었어', 'NEGATIVE', '음식', NOW()),
(1, '입맛이 없었어', 'NEGATIVE', '음식', NOW()),
(1, '못 먹었어', 'NEGATIVE', '음식', NOW()),
(1, '깜빡했어', 'NEGATIVE', '일상', NOW()),
(1, '아직', 'NEGATIVE', '일상', NOW()),
(1, '밥 생각이 없었어', 'NEGATIVE', '음식', NOW()),
(1, '속이 안 좋아서', 'NEGATIVE', '건강', NOW());
-- 중립 (10개)
INSERT IGNORE INTO expressions (matching_id, content, sentiment, category, created_at) VALUES
(1, '조금', 'NEUTRAL', '일상', NOW()),
(1, '좀 먹었어', 'NEUTRAL', '음식', NOW()),
(1, '반만 먹었어', 'NEUTRAL', '음식', NOW()),
(1, '대충 먹었어', 'NEUTRAL', '음식', NOW()),
(1, '간식만 먹었어', 'NEUTRAL', '음식', NOW()),
(1, '약이랑 같이 먹었어', 'NEUTRAL', '음식', NOW()),
(1, '잘 기억 안 나', 'NEUTRAL', '일상', NOW()),
(1, '뭐 먹었더라', 'NEUTRAL', '일상', NOW()),
(1, '죽만 조금', 'NEUTRAL', '음식', NOW()),
(1, '그냥', 'NEUTRAL', '일상', NOW());

-- ============================================================
-- 추가 테스트 3: 오늘 야구 어떻게 됐어?
-- ============================================================
-- 긍정 (10개)
INSERT IGNORE INTO expressions (matching_id, content, sentiment, category, created_at) VALUES
(1, '롯데 이겼어?', 'POSITIVE', '야구', NOW()),
(1, '야구 결과 알려줘', 'POSITIVE', '야구', NOW()),
(1, '홈런 쳤어?', 'POSITIVE', '야구', NOW()),
(1, '전준우 잘 했어?', 'POSITIVE', '야구', NOW()),
(1, '롯데 화이팅', 'POSITIVE', '야구', NOW()),
(1, '몇 대 몇이야?', 'POSITIVE', '야구', NOW()),
(1, '좋다 이겼어', 'POSITIVE', '야구', NOW()),
(1, '야구 보고 싶다', 'POSITIVE', '야구', NOW()),
(1, '경기 재밌었어?', 'POSITIVE', '야구', NOW()),
(1, '야구 중계 틀어줘', 'POSITIVE', '야구', NOW());
-- 부정 (10개)
INSERT IGNORE INTO expressions (matching_id, content, sentiment, category, created_at) VALUES
(1, '에이 졌어?', 'NEGATIVE', '야구', NOW()),
(1, '아쉽다', 'NEGATIVE', '야구', NOW()),
(1, '롯데 또 졌어?', 'NEGATIVE', '야구', NOW()),
(1, '야구 안 볼래', 'NEGATIVE', '야구', NOW()),
(1, '짜증나', 'NEGATIVE', '야구', NOW()),
(1, '답답해', 'NEGATIVE', '야구', NOW()),
(1, '다음엔 이기겠지', 'NEGATIVE', '야구', NOW()),
(1, '속상하다', 'NEGATIVE', '야구', NOW()),
(1, '왜 졌어', 'NEGATIVE', '야구', NOW()),
(1, '야구 보기 싫어', 'NEGATIVE', '야구', NOW());
-- 중립 (10개)
INSERT IGNORE INTO expressions (matching_id, content, sentiment, category, created_at) VALUES
(1, '아직 안 봤어', 'NEUTRAL', '야구', NOW()),
(1, '경기 있었어?', 'NEUTRAL', '야구', NOW()),
(1, '몰라', 'NEUTRAL', '일상', NOW()),
(1, '나중에 알려줘', 'NEUTRAL', '야구', NOW()),
(1, '스코어 알려줘', 'NEUTRAL', '야구', NOW()),
(1, '누가 던졌어?', 'NEUTRAL', '야구', NOW()),
(1, '하이라이트 보여줘', 'NEUTRAL', '야구', NOW()),
(1, '몇 회야?', 'NEUTRAL', '야구', NOW()),
(1, '야구 언제 해?', 'NEUTRAL', '야구', NOW()),
(1, '오늘 경기 있어?', 'NEUTRAL', '야구', NOW());

-- ============================================================
-- 추가 테스트 4: 나훈아 노래 틀어줄까?
-- ============================================================
-- 긍정 (10개)
INSERT IGNORE INTO expressions (matching_id, content, sentiment, category, created_at) VALUES
(1, '응 틀어줘', 'POSITIVE', '트로트', NOW()),
(1, '나훈아 좋아', 'POSITIVE', '트로트', NOW()),
(1, '테스형 틀어줘', 'POSITIVE', '트로트', NOW()),
(1, '나훈아 듣고 싶어', 'POSITIVE', '트로트', NOW()),
(1, '노래 틀어줘', 'POSITIVE', '트로트', NOW()),
(1, '트로트 듣고 싶어', 'POSITIVE', '트로트', NOW()),
(1, '둥지 틀어줘', 'POSITIVE', '트로트', NOW()),
(1, '나훈아 최고야', 'POSITIVE', '트로트', NOW()),
(1, '노래 좋다', 'POSITIVE', '트로트', NOW()),
(1, '응 듣고 싶어', 'POSITIVE', '트로트', NOW());
-- 부정 (10개)
INSERT IGNORE INTO expressions (matching_id, content, sentiment, category, created_at) VALUES
(1, '아니 됐어', 'NEGATIVE', '트로트', NOW()),
(1, '노래 싫어', 'NEGATIVE', '트로트', NOW()),
(1, '조용히 하고 싶어', 'NEGATIVE', '트로트', NOW()),
(1, '시끄러워', 'NEGATIVE', '트로트', NOW()),
(1, '다른 거 틀어줘', 'NEGATIVE', '트로트', NOW()),
(1, '임영웅 틀어줘', 'NEGATIVE', '트로트', NOW()),
(1, '나중에 들을래', 'NEGATIVE', '트로트', NOW()),
(1, '지금은 싫어', 'NEGATIVE', '트로트', NOW()),
(1, '노래 말고', 'NEGATIVE', '트로트', NOW()),
(1, '쉬고 싶어', 'NEGATIVE', '감정', NOW());
-- 중립 (10개)
INSERT IGNORE INTO expressions (matching_id, content, sentiment, category, created_at) VALUES
(1, '뭐 틀어줄 건데?', 'NEUTRAL', '트로트', NOW()),
(1, '무슨 노래?', 'NEUTRAL', '트로트', NOW()),
(1, '아무 노래나', 'NEUTRAL', '트로트', NOW()),
(1, '다른 가수는?', 'NEUTRAL', '트로트', NOW()),
(1, '임영웅도 좋아', 'NEUTRAL', '트로트', NOW()),
(1, '골라줘', 'NEUTRAL', '트로트', NOW()),
(1, '옛날 노래 틀어줘', 'NEUTRAL', '트로트', NOW()),
(1, '볼륨 좀 줄여줘', 'NEUTRAL', '일상', NOW()),
(1, '어떤 노래?', 'NEUTRAL', '트로트', NOW()),
(1, '송대관도 좋아', 'NEUTRAL', '트로트', NOW());

-- ============================================================
-- 추가 테스트 5: 기분이 어때?
-- ============================================================
-- 긍정 (10개)
INSERT IGNORE INTO expressions (matching_id, content, sentiment, category, created_at) VALUES
(1, '기분 좋아', 'POSITIVE', '감정', NOW()),
(1, '오늘 괜찮아', 'POSITIVE', '감정', NOW()),
(1, '좋은 날이야', 'POSITIVE', '감정', NOW()),
(1, '기분이 나아졌어', 'POSITIVE', '감정', NOW()),
(1, '웃음이 나와', 'POSITIVE', '감정', NOW()),
(1, '행복해', 'POSITIVE', '감정', NOW()),
(1, '마음이 편해', 'POSITIVE', '감정', NOW()),
(1, '오늘 기분 최고야', 'POSITIVE', '감정', NOW()),
(1, '좋아졌어', 'POSITIVE', '감정', NOW()),
(1, '나쁘지 않아', 'POSITIVE', '감정', NOW());
-- 부정 (10개)
INSERT IGNORE INTO expressions (matching_id, content, sentiment, category, created_at) VALUES
(1, '기분 별로야', 'NEGATIVE', '감정', NOW()),
(1, '우울해', 'NEGATIVE', '감정', NOW()),
(1, '짜증나', 'NEGATIVE', '감정', NOW()),
(1, '슬퍼', 'NEGATIVE', '감정', NOW()),
(1, '기분이 안 좋아', 'NEGATIVE', '감정', NOW()),
(1, '화가 나', 'NEGATIVE', '감정', NOW()),
(1, '불안해', 'NEGATIVE', '감정', NOW()),
(1, '답답해', 'NEGATIVE', '감정', NOW()),
(1, '외로워', 'NEGATIVE', '감정', NOW()),
(1, '힘들어', 'NEGATIVE', '감정', NOW());
-- 중립 (10개)
INSERT IGNORE INTO expressions (matching_id, content, sentiment, category, created_at) VALUES
(1, '그냥 그래', 'NEUTRAL', '감정', NOW()),
(1, '보통이야', 'NEUTRAL', '감정', NOW()),
(1, '그저 그래', 'NEUTRAL', '감정', NOW()),
(1, '잘 모르겠어', 'NEUTRAL', '감정', NOW()),
(1, '뭐 그렇지', 'NEUTRAL', '감정', NOW()),
(1, '평범해', 'NEUTRAL', '감정', NOW()),
(1, '특별한 건 없어', 'NEUTRAL', '감정', NOW()),
(1, '어제랑 비슷해', 'NEUTRAL', '감정', NOW()),
(1, '그냥', 'NEUTRAL', '감정', NOW()),
(1, '무덤덤해', 'NEUTRAL', '감정', NOW());

-- ============================================================
-- 추가 테스트 6: 필요한 거 있어?
-- ============================================================
-- 긍정 (10개)
INSERT IGNORE INTO expressions (matching_id, content, sentiment, category, created_at) VALUES
(1, '물 좀 줘', 'POSITIVE', '욕구', NOW()),
(1, '이불 좀 덮어줘', 'POSITIVE', '욕구', NOW()),
(1, '자세 좀 바꿔줘', 'POSITIVE', '욕구', NOW()),
(1, '리모컨 줘', 'POSITIVE', '욕구', NOW()),
(1, '화장실 가고 싶어', 'POSITIVE', '욕구', NOW()),
(1, '약 줘', 'POSITIVE', '욕구', NOW()),
(1, '창문 열어줘', 'POSITIVE', '욕구', NOW()),
(1, '불 꺼줘', 'POSITIVE', '욕구', NOW()),
(1, '안경 줘', 'POSITIVE', '욕구', NOW()),
(1, '휴대폰 줘', 'POSITIVE', '욕구', NOW());
-- 부정 (10개)
INSERT IGNORE INTO expressions (matching_id, content, sentiment, category, created_at) VALUES
(1, '아니 없어', 'NEGATIVE', '일상', NOW()),
(1, '괜찮아 됐어', 'NEGATIVE', '일상', NOW()),
(1, '필요 없어', 'NEGATIVE', '일상', NOW()),
(1, '아니', 'NEGATIVE', '일상', NOW()),
(1, '지금은 없어', 'NEGATIVE', '일상', NOW()),
(1, '됐어', 'NEGATIVE', '일상', NOW()),
(1, '아무것도 필요 없어', 'NEGATIVE', '일상', NOW()),
(1, '나중에 말할게', 'NEGATIVE', '일상', NOW()),
(1, '생각나면 말할게', 'NEGATIVE', '일상', NOW()),
(1, '그냥 있어줘', 'NEGATIVE', '감정', NOW());
-- 중립 (10개)
INSERT IGNORE INTO expressions (matching_id, content, sentiment, category, created_at) VALUES
(1, '잠깐 생각해볼게', 'NEUTRAL', '일상', NOW()),
(1, '뭐가 있지', 'NEUTRAL', '일상', NOW()),
(1, '음', 'NEUTRAL', '일상', NOW()),
(1, '있긴 한데', 'NEUTRAL', '일상', NOW()),
(1, '좀 있다가 말할게', 'NEUTRAL', '일상', NOW()),
(1, '글쎄', 'NEUTRAL', '일상', NOW()),
(1, '뭐 필요하지', 'NEUTRAL', '일상', NOW()),
(1, '혹시 뭐 있어?', 'NEUTRAL', '일상', NOW()),
(1, '잠깐만', 'NEUTRAL', '일상', NOW()),
(1, '아 그거', 'NEUTRAL', '일상', NOW());
