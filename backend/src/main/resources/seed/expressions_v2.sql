-- ============================================
-- EXPRESSIONS v2 — 환자 페르소나: 박윤환 (67세 남성 ALS)
-- 손녀딸(김예승), 롯데(야구), 트로트, 참기름죽
-- 왼쪽 어깨 통증 심함, 오른쪽 다리/허리 통증
-- ============================================

-- 3. EXPRESSIONS (matching_id=1)
-- 통증 관련 (왼쪽 어깨 집중, 오른쪽 다리, 허리)
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (1, 1, '왼쪽 어깨 또 저려', 'NEGATIVE', '통증', '2026-03-24T08:30:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (2, 1, '어깨 좀 주물러줘', 'NEUTRAL', '요청', '2026-03-24T09:15:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (3, 1, '왼쪽 어깨가 많이 아파', 'NEGATIVE', '통증', '2026-03-23T10:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (4, 1, '어깨 찜질 해줘', 'NEUTRAL', '요청', '2026-03-23T14:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (5, 1, '오른쪽 다리 아파', 'NEGATIVE', '통증', '2026-03-24T11:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (6, 1, '다리 좀 올려줘', 'NEUTRAL', '요청', '2026-03-23T15:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (7, 1, '다리 저려', 'NEGATIVE', '통증', '2026-03-22T16:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (8, 1, '허리 불편해', 'NEGATIVE', '통증', '2026-03-24T07:30:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (9, 1, '허리 좀 받쳐줘', 'NEUTRAL', '요청', '2026-03-23T08:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (10, 1, '몸이 뻐근해', 'NEGATIVE', '통증', '2026-03-22T20:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (11, 1, '오늘 어깨 좀 나아', 'POSITIVE', '통증', '2026-03-21T09:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (12, 1, '진통제 줘', 'NEUTRAL', '요청', '2026-03-24T10:30:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (13, 1, '마사지 해줘', 'NEUTRAL', '요청', '2026-03-23T16:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (14, 1, '목 아파', 'NEGATIVE', '통증', '2026-03-22T11:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (15, 1, '등 시려', 'NEGATIVE', '통증', '2026-03-21T06:00:00', NOW());

-- 손녀딸 (김예승) 관련
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (16, 1, '예승이 보고 싶어', 'POSITIVE', '가족', '2026-03-24T18:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (17, 1, '예승이 언제 와', 'NEUTRAL', '가족', '2026-03-24T10:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (18, 1, '예승이 학교 잘 다녀', 'NEUTRAL', '가족', '2026-03-23T09:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (19, 1, '예승이 오면 좋겠다', 'POSITIVE', '가족', '2026-03-23T17:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (20, 1, '예승이 생각나', 'POSITIVE', '가족', '2026-03-22T19:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (21, 1, '예승이 사진 보여줘', 'NEUTRAL', '가족', '2026-03-22T14:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (22, 1, '예승이한테 전화해줘', 'NEUTRAL', '요청', '2026-03-21T18:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (23, 1, '예승이가 보내준 편지 읽어줘', 'POSITIVE', '가족', '2026-03-20T15:00:00', NOW());

-- 가족 관련
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (24, 1, '딸 언제 와', 'NEUTRAL', '가족', '2026-03-23T11:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (25, 1, '아들 잘 있어', 'NEUTRAL', '가족', '2026-03-22T20:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (26, 1, '집사람 어디 갔어', 'NEUTRAL', '가족', '2026-03-24T12:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (27, 1, '가족 보고 싶어', 'POSITIVE', '가족', '2026-03-21T21:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (28, 1, '고마워', 'POSITIVE', '감정', '2026-03-24T09:00:00', NOW());

-- 야구/롯데 관련
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (29, 1, '롯데 오늘 경기해', 'NEUTRAL', '여가', '2026-03-24T13:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (30, 1, '야구 보고 싶어', 'POSITIVE', '여가', '2026-03-24T14:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (31, 1, '야구 중계 틀어줘', 'NEUTRAL', '요청', '2026-03-24T14:30:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (32, 1, '롯데 이겼어', 'POSITIVE', '여가', '2026-03-23T21:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (33, 1, '롯데 졌어', 'NEGATIVE', '여가', '2026-03-22T21:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (34, 1, '오늘 선발 누구야', 'NEUTRAL', '여가', '2026-03-24T13:30:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (35, 1, '사직구장 가고 싶다', 'POSITIVE', '여가', '2026-03-20T15:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (36, 1, '야구 결과 알려줘', 'NEUTRAL', '여가', '2026-03-23T22:00:00', NOW());

-- 트로트/음악 관련
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (37, 1, '트로트 틀어줘', 'NEUTRAL', '요청', '2026-03-24T07:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (38, 1, '트로트 듣고 싶어', 'POSITIVE', '여가', '2026-03-24T06:30:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (39, 1, '이 노래 좋다', 'POSITIVE', '여가', '2026-03-23T07:30:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (40, 1, '나훈아 노래 듣고 싶어', 'POSITIVE', '여가', '2026-03-22T07:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (41, 1, '노래 듣고 있으면 편해', 'POSITIVE', '여가', '2026-03-23T08:00:00', NOW());

-- 식사/음식 관련
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (42, 1, '참기름죽 먹고 싶어', 'POSITIVE', '음식', '2026-03-24T08:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (43, 1, '죽 맛있었어', 'POSITIVE', '음식', '2026-03-23T08:30:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (44, 1, '밥 먹을 시간이야', 'NEUTRAL', '일정', '2026-03-24T12:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (45, 1, '배고파', 'NEUTRAL', '음식', '2026-03-24T11:30:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (46, 1, '물 좀 줘', 'NEUTRAL', '요청', '2026-03-24T10:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (47, 1, '목 말라', 'NEUTRAL', '요청', '2026-03-23T15:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (48, 1, '김치찌개 먹고 싶어', 'POSITIVE', '음식', '2026-03-22T12:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (49, 1, '국밥 먹고 싶어', 'POSITIVE', '음식', '2026-03-21T12:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (50, 1, '맛있었어', 'POSITIVE', '음식', '2026-03-24T08:30:00', NOW());

-- 기분/감정 관련
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (51, 1, '오늘 기분 괜찮아', 'POSITIVE', '기분', '2026-03-24T09:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (52, 1, '기분 좋아', 'POSITIVE', '기분', '2026-03-23T14:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (53, 1, '좀 우울해', 'NEGATIVE', '기분', '2026-03-22T21:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (54, 1, '힘들어', 'NEGATIVE', '기분', '2026-03-23T20:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (55, 1, '그래도 괜찮아', 'POSITIVE', '기분', '2026-03-24T10:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (56, 1, '오늘은 좀 나아', 'POSITIVE', '기분', '2026-03-24T11:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (57, 1, '피곤해', 'NEGATIVE', '상태', '2026-03-23T22:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (58, 1, '잠이 안 와', 'NEGATIVE', '상태', '2026-03-22T23:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (59, 1, '외로워', 'NEGATIVE', '감정', '2026-03-21T22:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (60, 1, '답답해', 'NEGATIVE', '감정', '2026-03-22T16:00:00', NOW());

-- 일상/일정 관련
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (61, 1, '약 먹을 시간이야', 'NEUTRAL', '일정', '2026-03-24T10:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (62, 1, '물리치료 받을래', 'NEUTRAL', '일정', '2026-03-24T14:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (63, 1, '오늘 치료 있어', 'NEUTRAL', '일정', '2026-03-23T09:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (64, 1, '자세 바꿔줘', 'NEUTRAL', '요청', '2026-03-24T15:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (65, 1, '베개 높여줘', 'NEUTRAL', '요청', '2026-03-23T21:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (66, 1, '창문 열어줘', 'NEUTRAL', '요청', '2026-03-24T10:30:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (67, 1, '불 꺼줘', 'NEUTRAL', '요청', '2026-03-23T22:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (68, 1, 'TV 틀어줘', 'NEUTRAL', '요청', '2026-03-24T14:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (69, 1, '도와줘', 'NEUTRAL', '요청', '2026-03-23T11:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (70, 1, '빨리 낫고 싶어', 'POSITIVE', '감정', '2026-03-24T20:00:00', NOW());

-- 위루술/경관식 관련
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (91, 1, '위루술 해줘', 'NEUTRAL', '의료', '2026-03-24T10:50:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (92, 1, '위루술 세척 시간이야', 'NEUTRAL', '의료', '2026-03-23T11:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (93, 1, '위루관 주변 아파', 'NEGATIVE', '의료', '2026-03-24T09:30:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (94, 1, '경관식 시간이야', 'NEUTRAL', '의료', '2026-03-24T12:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (95, 1, '경관식 속도 줄여줘', 'NEUTRAL', '의료', '2026-03-23T12:30:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (96, 1, '경관식 멈춰줘', 'NEUTRAL', '의료', '2026-03-22T12:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (97, 1, '속이 불편해', 'NEGATIVE', '의료', '2026-03-23T13:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (98, 1, '토할 것 같아', 'NEGATIVE', '의료', '2026-03-22T12:30:00', NOW());

-- 가래 석션/호흡 관련
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (99, 1, '가래 빼줘', 'NEUTRAL', '의료', '2026-03-24T08:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (100, 1, '가래가 많아', 'NEGATIVE', '의료', '2026-03-24T07:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (101, 1, '침 빼줘', 'NEUTRAL', '의료', '2026-03-23T08:30:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (102, 1, '침이 흘러', 'NEGATIVE', '의료', '2026-03-23T09:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (103, 1, '석션 더 해줘', 'NEUTRAL', '의료', '2026-03-24T08:30:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (104, 1, '석션 그만', 'NEUTRAL', '의료', '2026-03-23T08:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (105, 1, '가래가 안 나와', 'NEGATIVE', '의료', '2026-03-22T09:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (106, 1, '기침유발기 해줘', 'NEUTRAL', '의료', '2026-03-21T10:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (107, 1, '숨쉬기 힘들어', 'NEGATIVE', '의료', '2026-03-24T06:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (108, 1, '호흡기 불편해', 'NEGATIVE', '의료', '2026-03-23T06:30:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (109, 1, '산소포화도 확인해줘', 'NEUTRAL', '의료', '2026-03-22T07:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (110, 1, '숨쉬기 편해졌어', 'POSITIVE', '의료', '2026-03-24T09:00:00', NOW());

-- 추가 일상/환경
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (111, 1, '덥다', 'NEGATIVE', '환경', '2026-03-24T14:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (112, 1, '춥다', 'NEGATIVE', '환경', '2026-03-23T06:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (113, 1, '환기 해줘', 'NEUTRAL', '환경', '2026-03-24T10:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (114, 1, '좋아', 'POSITIVE', '평가', '2026-03-24T11:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (115, 1, '별로야', 'NEGATIVE', '평가', '2026-03-23T18:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (116, 1, '그저그래', 'NEUTRAL', '평가', '2026-03-22T17:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (117, 1, '맛있어', 'POSITIVE', '음식', '2026-03-24T08:30:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (118, 1, '갈증나', 'NEUTRAL', '요청', '2026-03-23T14:30:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (119, 1, '손 잡아줘', 'NEUTRAL', '요청', '2026-03-22T20:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (120, 1, '사랑해', 'POSITIVE', '감정', '2026-03-24T21:00:00', NOW());

-- 추가 EXPRESSION_KEYWORDS (91~120)
INSERT INTO expression_keywords (expr_id, keyword) VALUES (91, '위루술');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (92, '위루술');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (92, '세척');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (93, '위루관');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (93, '아프다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (94, '경관식');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (94, '시간');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (95, '경관식');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (95, '줄이다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (96, '경관식');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (96, '멈추다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (97, '속');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (97, '불편하다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (98, '토하다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (99, '가래');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (99, '빼다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (100, '가래');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (100, '많다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (101, '침');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (101, '빼다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (102, '침');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (102, '흐르다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (103, '석션');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (103, '더');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (104, '석션');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (104, '그만');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (105, '가래');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (105, '나오다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (106, '기침유발기');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (107, '숨');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (107, '힘들다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (108, '호흡기');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (108, '불편하다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (109, '산소포화도');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (110, '숨');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (110, '편하다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (111, '덥다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (112, '춥다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (113, '환기');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (114, '좋다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (115, '별로');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (116, '그저그렇다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (117, '맛있다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (118, '갈증');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (119, '손');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (119, '잡다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (120, '사랑하다');

-- 추가 EXPRESSIONS: 응답형 표현 (야구/트로트/음식/일상)
-- 야구 응답형
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (121, 1, '진짜? 좋다!', 'POSITIVE', '여가', '2026-03-24T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (122, 1, '몇 대 몇이야?', 'NEUTRAL', '여가', '2026-03-24T15:30:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (123, 1, '누가 잘 했어?', 'NEUTRAL', '여가', '2026-03-24T16:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (124, 1, '다음 경기 언제야?', 'NEUTRAL', '여가', '2026-03-23T21:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (125, 1, '역전이야?', 'POSITIVE', '여가', '2026-03-23T20:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (126, 1, '홈런 쳤어?', 'POSITIVE', '여가', '2026-03-22T21:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (127, 1, '아깝다 졌네', 'NEGATIVE', '여가', '2026-03-22T22:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (128, 1, '다음에 이기면 되지', 'POSITIVE', '여가', '2026-03-21T21:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (129, 1, '오늘 기분 좋겠다', 'POSITIVE', '기분', '2026-03-24T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (130, 1, '전준우가 쳤어?', 'NEUTRAL', '여가', '2026-03-24T15:30:00', NOW());

-- 음식/음료 응답형
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (131, 1, '응 마실게', 'POSITIVE', '음식', '2026-03-24T10:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (132, 1, '아니 됐어', 'NEGATIVE', '음식', '2026-03-23T10:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (133, 1, '다른 거 줘', 'NEUTRAL', '음식', '2026-03-23T11:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (134, 1, '조금만 줘', 'NEUTRAL', '음식', '2026-03-24T08:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (135, 1, '맛있다', 'POSITIVE', '음식', '2026-03-24T08:30:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (136, 1, '좀 더 줘', 'NEUTRAL', '음식', '2026-03-23T12:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (137, 1, '배 불러', 'NEUTRAL', '음식', '2026-03-22T12:30:00', NOW());

-- 일상 응답형
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (138, 1, '응', 'POSITIVE', '일상', '2026-03-24T09:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (139, 1, '아니', 'NEGATIVE', '일상', '2026-03-24T09:30:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (140, 1, '잘 모르겠어', 'NEUTRAL', '일상', '2026-03-23T10:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (141, 1, '그래 알았어', 'POSITIVE', '일상', '2026-03-24T11:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (142, 1, '나중에', 'NEUTRAL', '일상', '2026-03-23T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (143, 1, '고맙다', 'POSITIVE', '감정', '2026-03-24T10:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (144, 1, '그냥 그래', 'NEUTRAL', '기분', '2026-03-23T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (145, 1, '오늘은 좀 힘들어', 'NEGATIVE', '기분', '2026-03-24T20:00:00', NOW());

-- 추가 EXPRESSION_KEYWORDS (121~145)
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (121, '좋다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (122, '점수');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (123, '잘하다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (124, '경기');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (124, '언제');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (125, '역전');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (126, '홈런');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (127, '지다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (128, '이기다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (129, '기분');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (129, '좋다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (130, '전준우');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (131, '마시다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (132, '됐다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (133, '다른');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (134, '조금');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (135, '맛있다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (136, '더');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (137, '배');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (137, '부르다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (138, '응');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (139, '아니');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (140, '모르다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (141, '알다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (142, '나중');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (143, '고맙다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (144, '그냥');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (145, '힘들다');

-- 추가 EXPRESSIONS: 통증 응답형
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (146, 1, '좀 나아졌어', 'POSITIVE', '통증', '2026-03-25T09:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (147, 1, '참을 만해', 'NEUTRAL', '통증', '2026-03-25T10:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (148, 1, '어제보다 덜 아파', 'POSITIVE', '통증', '2026-03-25T08:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (149, 1, '좀 쑤셔', 'NEGATIVE', '통증', '2026-03-24T16:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (150, 1, '아직 아파', 'NEGATIVE', '통증', '2026-03-25T07:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (151, 1, '약 먹으니까 좀 나아', 'POSITIVE', '통증', '2026-03-24T11:00:00', NOW());

-- 시간대별 표현
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (152, 1, '아침이다', 'NEUTRAL', '일상', '2026-03-25T07:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (153, 1, '점심 시간이야', 'NEUTRAL', '일상', '2026-03-25T12:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (154, 1, '저녁이네', 'NEUTRAL', '일상', '2026-03-25T18:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (155, 1, '잠 올 시간이야', 'NEUTRAL', '일상', '2026-03-24T22:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (156, 1, '10시다 약 먹어야지', 'NEUTRAL', '일정', '2026-03-25T10:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (157, 1, '1시다 약 시간이야', 'NEUTRAL', '일정', '2026-03-25T13:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (158, 1, '7시다 약 먹자', 'NEUTRAL', '일정', '2026-03-25T19:00:00', NOW());

-- 날씨/계절
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (159, 1, '오늘 날씨 좋다', 'POSITIVE', '환경', '2026-03-25T10:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (160, 1, '비 오네', 'NEUTRAL', '환경', '2026-03-24T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (161, 1, '바람 분다', 'NEUTRAL', '환경', '2026-03-23T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (162, 1, '따뜻해졌다', 'POSITIVE', '환경', '2026-03-25T11:00:00', NOW());

-- 예승이 응답형 추가
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (163, 1, '예승이 잘 있어?', 'NEUTRAL', '가족', '2026-03-25T17:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (164, 1, '예승이 뭐 하고 있어?', 'NEUTRAL', '가족', '2026-03-24T18:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (165, 1, '예승이 키 많이 컸겠다', 'POSITIVE', '가족', '2026-03-23T17:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (166, 1, '예승이 방학이야?', 'NEUTRAL', '가족', '2026-03-22T16:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (167, 1, '예승이 같이 야구 보고 싶다', 'POSITIVE', '가족', '2026-03-25T14:00:00', NOW());

-- 감사/사과/위로
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (168, 1, '항상 고마워', 'POSITIVE', '감정', '2026-03-25T20:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (169, 1, '걱정 끼쳐서 미안해', 'NEGATIVE', '감정', '2026-03-24T21:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (170, 1, '신경 써줘서 고마워', 'POSITIVE', '감정', '2026-03-25T09:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (171, 1, '괜찮아 신경 쓰지 마', 'POSITIVE', '감정', '2026-03-24T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (172, 1, '별거 아니야', 'POSITIVE', '감정', '2026-03-23T16:00:00', NOW());

-- 추가 EXPRESSION_KEYWORDS (146~172)
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (146, '낫다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (147, '참다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (148, '어제');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (148, '덜');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (148, '아프다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (149, '쑤시다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (150, '아프다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (151, '약');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (151, '낫다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (152, '아침');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (153, '점심');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (153, '시간');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (154, '저녁');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (155, '잠');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (155, '시간');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (156, '약');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (156, '10시');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (157, '약');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (157, '1시');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (158, '약');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (158, '7시');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (159, '날씨');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (159, '좋다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (160, '비');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (161, '바람');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (162, '따뜻하다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (163, '예승');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (163, '잘 있다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (164, '예승');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (164, '하다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (165, '예승');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (165, '키');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (165, '크다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (166, '예승');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (166, '방학');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (167, '예승');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (167, '야구');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (167, '보다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (168, '고맙다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (169, '걱정');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (169, '미안하다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (170, '신경');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (170, '고맙다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (171, '괜찮다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (171, '신경');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (172, '별거');

-- 추가 EXPRESSIONS: 일상 응답형 (상대방 말에 반응)
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (173, 1, '그래? 뭐 샀어?', 'NEUTRAL', '일상', '2026-03-25T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (174, 1, '잘 다녀왔어?', 'NEUTRAL', '일상', '2026-03-25T16:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (175, 1, '힘들었겠다', 'NEUTRAL', '감정', '2026-03-24T17:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (176, 1, '나도 가고 싶었는데', 'NEUTRAL', '감정', '2026-03-24T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (177, 1, '진짜?', 'NEUTRAL', '일상', '2026-03-25T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (178, 1, '그래?', 'NEUTRAL', '일상', '2026-03-25T11:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (179, 1, '좋았어?', 'NEUTRAL', '일상', '2026-03-24T16:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (180, 1, '오래 걸렸어?', 'NEUTRAL', '일상', '2026-03-23T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (181, 1, '잘 됐다', 'POSITIVE', '감정', '2026-03-25T10:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (182, 1, '대단하다', 'POSITIVE', '감정', '2026-03-24T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (183, 1, '에이 아쉽다', 'NEGATIVE', '감정', '2026-03-23T20:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (184, 1, '속상하겠다', 'NEGATIVE', '감정', '2026-03-22T19:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (185, 1, '괜찮아질 거야', 'POSITIVE', '감정', '2026-03-25T09:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (186, 1, '그렇게 하자', 'POSITIVE', '일상', '2026-03-25T11:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (187, 1, '맛있겠다', 'POSITIVE', '음식', '2026-03-24T12:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (188, 1, '나도 먹고 싶어', 'NEUTRAL', '음식', '2026-03-25T12:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (189, 1, '그거 좋아하는데', 'POSITIVE', '일상', '2026-03-24T13:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (190, 1, '시간 빠르다', 'NEUTRAL', '일상', '2026-03-25T18:00:00', NOW());

-- 추가 EXPRESSION_KEYWORDS (173~190)
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (173, '사다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (174, '다녀오다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (175, '힘들다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (176, '가다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (177, '진짜');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (178, '그래');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (179, '좋다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (180, '오래');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (180, '걸리다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (181, '잘 되다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (182, '대단하다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (183, '아쉽다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (184, '속상하다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (185, '괜찮다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (186, '하다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (187, '맛있다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (188, '먹다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (189, '좋아하다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (190, '시간');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (190, '빠르다');

-- 추가 EXPRESSIONS: 닫힌 질문 응답형 + 가족 방문 응답
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (191, 1, '응 불러줘', 'POSITIVE', '일상', '2026-03-25T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (192, 1, '빨리 왔으면 좋겠어', 'POSITIVE', '가족', '2026-03-25T17:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (193, 1, '보고 싶다고 전해줘', 'POSITIVE', '가족', '2026-03-24T18:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (194, 1, '예승이 데리고 와', 'POSITIVE', '가족', '2026-03-25T16:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (195, 1, '오면 야구 같이 보자', 'POSITIVE', '가족', '2026-03-24T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (196, 1, '영상통화라도 하자', 'NEUTRAL', '가족', '2026-03-23T19:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (197, 1, '기다리고 있을게', 'POSITIVE', '가족', '2026-03-25T17:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (198, 1, '사랑한다고 전해줘', 'POSITIVE', '가족', '2026-03-24T20:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (199, 1, '아니 나중에', 'NEGATIVE', '일상', '2026-03-23T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (200, 1, '지금은 좀 힘들어서', 'NEGATIVE', '일상', '2026-03-24T20:00:00', NOW());

-- 추가 EXPRESSION_KEYWORDS (191~200)
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (191, '부르다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (192, '빨리');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (192, '오다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (193, '보고 싶다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (193, '전하다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (194, '예승');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (194, '데리다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (195, '야구');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (195, '보다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (196, '영상통화');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (197, '기다리다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (198, '사랑하다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (198, '전하다');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (199, '나중');
INSERT IGNORE INTO expression_keywords (expr_id, keyword) VALUES (200, '힘들다');

-- ===== 대량 추가: 응답형 expressions 200개 (id 201~400) =====

-- 닫힌 질문 응답 — "응" 계열 (201~225)
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (201, 1, '응 불러줘', 'POSITIVE', '일상', '2026-03-25T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (202, 1, '응 해줘', 'POSITIVE', '일상', '2026-03-25T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (203, 1, '응 먹을게', 'POSITIVE', '음식', '2026-03-25T12:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (204, 1, '응 마실게', 'POSITIVE', '음식', '2026-03-25T10:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (205, 1, '응 보고 싶어', 'POSITIVE', '가족', '2026-03-25T17:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (206, 1, '그래 부탁해', 'POSITIVE', '일상', '2026-03-25T11:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (207, 1, '빨리 해줘', 'NEUTRAL', '요청', '2026-03-24T16:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (208, 1, '당연하지', 'POSITIVE', '일상', '2026-03-24T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (209, 1, '좋지', 'POSITIVE', '일상', '2026-03-25T09:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (210, 1, '그럼 그럼', 'POSITIVE', '일상', '2026-03-24T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (211, 1, '응 기다릴게', 'POSITIVE', '가족', '2026-03-25T17:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (212, 1, '빨리 오라고 해', 'NEUTRAL', '가족', '2026-03-25T16:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (213, 1, '빨리 왔으면', 'POSITIVE', '가족', '2026-03-24T18:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (214, 1, '물론이지', 'POSITIVE', '일상', '2026-03-25T10:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (215, 1, '고마워 잘 먹을게', 'POSITIVE', '음식', '2026-03-25T08:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (216, 1, '그거 먹고 싶었어', 'POSITIVE', '음식', '2026-03-24T12:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (217, 1, '오렌지 주스가 좋아', 'POSITIVE', '음식', '2026-03-25T10:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (218, 1, '계란죽이 좋아', 'POSITIVE', '음식', '2026-03-25T08:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (219, 1, '응 듣고 싶어', 'POSITIVE', '여가', '2026-03-25T07:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (220, 1, '응 보자', 'POSITIVE', '여가', '2026-03-25T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (221, 1, '응 괜찮아', 'POSITIVE', '기분', '2026-03-25T09:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (222, 1, '응 나아졌어', 'POSITIVE', '통증', '2026-03-25T10:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (223, 1, '그래 알겠어', 'POSITIVE', '일상', '2026-03-25T11:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (224, 1, '응 할게', 'POSITIVE', '일상', '2026-03-24T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (225, 1, '응 가고 싶어', 'POSITIVE', '일상', '2026-03-24T14:00:00', NOW());

-- 닫힌 질문 응답 — "아니" 계열 (226~245)
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (226, 1, '아니 됐어', 'NEGATIVE', '일상', '2026-03-25T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (227, 1, '아니 괜찮아', 'NEGATIVE', '일상', '2026-03-25T10:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (228, 1, '지금은 싫어', 'NEGATIVE', '일상', '2026-03-24T16:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (229, 1, '안 먹을래', 'NEGATIVE', '음식', '2026-03-24T12:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (230, 1, '안 마실래', 'NEGATIVE', '음식', '2026-03-23T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (231, 1, '나중에 하자', 'NEUTRAL', '일상', '2026-03-25T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (232, 1, '다음에 하자', 'NEUTRAL', '일상', '2026-03-24T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (233, 1, '좀 이따가', 'NEUTRAL', '일상', '2026-03-25T11:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (234, 1, '힘들어서 안 돼', 'NEGATIVE', '일상', '2026-03-24T20:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (235, 1, '오늘은 그만', 'NEGATIVE', '일상', '2026-03-24T21:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (236, 1, '그건 좀 그래', 'NEGATIVE', '일상', '2026-03-23T16:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (237, 1, '필요 없어', 'NEGATIVE', '일상', '2026-03-23T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (238, 1, '귀찮아', 'NEGATIVE', '일상', '2026-03-22T18:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (239, 1, '그거 말고', 'NEGATIVE', '음식', '2026-03-24T12:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (240, 1, '몸이 안 좋아서', 'NEGATIVE', '통증', '2026-03-25T08:00:00', NOW());

-- 야구 응답형 (241~270)
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (241, 1, '진짜? 이겼어?', 'POSITIVE', '여가', '2026-03-25T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (242, 1, '좋다! 몇 대 몇?', 'POSITIVE', '여가', '2026-03-25T15:30:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (243, 1, '전준우 쳤어?', 'NEUTRAL', '여가', '2026-03-25T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (244, 1, '김원중 던졌어?', 'NEUTRAL', '여가', '2026-03-24T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (245, 1, '홈런 나왔어?', 'NEUTRAL', '여가', '2026-03-25T16:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (246, 1, '역전이야?', 'POSITIVE', '여가', '2026-03-24T16:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (247, 1, '에이 졌어?', 'NEGATIVE', '여가', '2026-03-23T21:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (248, 1, '아깝다', 'NEGATIVE', '여가', '2026-03-22T21:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (249, 1, '그래도 잘 싸웠어', 'POSITIVE', '여가', '2026-03-23T22:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (250, 1, '내일은 이기자', 'POSITIVE', '여가', '2026-03-24T22:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (251, 1, '야구 보니까 좋다', 'POSITIVE', '여가', '2026-03-25T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (252, 1, '롯데 화이팅', 'POSITIVE', '여가', '2026-03-25T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (253, 1, '올해는 기대된다', 'POSITIVE', '여가', '2026-03-24T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (254, 1, '순위 몇 위야?', 'NEUTRAL', '여가', '2026-03-25T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (255, 1, '예승이랑 야구 보고 싶어', 'POSITIVE', '가족', '2026-03-25T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (256, 1, '하이라이트 보여줘', 'NEUTRAL', '여가', '2026-03-24T21:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (257, 1, '중계 다시 보여줘', 'NEUTRAL', '여가', '2026-03-23T22:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (258, 1, '내일도 경기 있어?', 'NEUTRAL', '여가', '2026-03-25T21:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (259, 1, '같이 보고 싶다', 'POSITIVE', '여가', '2026-03-24T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (260, 1, '오늘 응원했어', 'POSITIVE', '여가', '2026-03-25T20:00:00', NOW());

-- 트로트/음악 응답형 (261~280)
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (261, 1, '나훈아 틀어줘', 'NEUTRAL', '여가', '2026-03-25T07:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (262, 1, '임영웅 틀어줘', 'NEUTRAL', '여가', '2026-03-24T07:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (263, 1, '한 번 더 틀어줘', 'NEUTRAL', '여가', '2026-03-25T07:30:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (264, 1, '좋은 노래다', 'POSITIVE', '여가', '2026-03-24T08:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (265, 1, '옛날 생각나', 'NEUTRAL', '감정', '2026-03-23T07:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (266, 1, '소리 좀 키워줘', 'NEUTRAL', '요청', '2026-03-25T07:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (267, 1, '다른 노래 틀어줘', 'NEUTRAL', '여가', '2026-03-24T08:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (268, 1, '테스형 틀어줘', 'POSITIVE', '여가', '2026-03-25T07:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (269, 1, '기분 전환됐어', 'POSITIVE', '기분', '2026-03-24T08:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (270, 1, '노래 고마워', 'POSITIVE', '감정', '2026-03-25T08:00:00', NOW());

-- 통증 응답형 (271~300)
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (271, 1, '응 좀 아파', 'NEGATIVE', '통증', '2026-03-25T09:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (272, 1, '많이 아파', 'NEGATIVE', '통증', '2026-03-25T08:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (273, 1, '어제보다 나아', 'POSITIVE', '통증', '2026-03-25T10:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (274, 1, '약 먹으면 좀 나아', 'NEUTRAL', '통증', '2026-03-24T11:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (275, 1, '아침에 더 아파', 'NEGATIVE', '통증', '2026-03-25T07:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (276, 1, '밤에 더 아파', 'NEGATIVE', '통증', '2026-03-24T22:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (277, 1, '가만히 있으면 괜찮아', 'NEUTRAL', '통증', '2026-03-25T09:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (278, 1, '움직이면 아파', 'NEGATIVE', '통증', '2026-03-24T10:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (279, 1, '찜질하면 좀 나아', 'NEUTRAL', '통증', '2026-03-23T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (280, 1, '걱정 마 괜찮아', 'POSITIVE', '감정', '2026-03-25T10:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (281, 1, '그냥 좀 아픈 거야', 'NEUTRAL', '통증', '2026-03-24T11:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (282, 1, '좀 있으면 나아지겠지', 'POSITIVE', '통증', '2026-03-25T11:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (283, 1, '약 효과 있어', 'POSITIVE', '통증', '2026-03-25T11:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (284, 1, '약 효과 없어', 'NEGATIVE', '통증', '2026-03-24T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (285, 1, '숨쉬기 좀 힘들어', 'NEGATIVE', '의료', '2026-03-25T06:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (286, 1, '가래 좀 빼줘', 'NEUTRAL', '의료', '2026-03-25T07:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (287, 1, '숨쉬기 편해졌어', 'POSITIVE', '의료', '2026-03-25T09:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (288, 1, '체위 변경 해줘', 'NEUTRAL', '요청', '2026-03-24T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (289, 1, '왼쪽 어깨 좀 봐줘', 'NEUTRAL', '통증', '2026-03-25T08:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (290, 1, '오른쪽 다리 좀 봐줘', 'NEUTRAL', '통증', '2026-03-24T16:00:00', NOW());

-- 보호자 행동 반응형 (291~320)
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (291, 1, '고생했어', 'POSITIVE', '감정', '2026-03-25T17:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (292, 1, '수고했어', 'POSITIVE', '감정', '2026-03-24T18:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (293, 1, '뭐 사왔어?', 'NEUTRAL', '일상', '2026-03-25T16:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (294, 1, '맛있는 거 사왔어?', 'NEUTRAL', '음식', '2026-03-24T17:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (295, 1, '기다렸어', 'NEUTRAL', '감정', '2026-03-25T17:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (296, 1, '혼자 있으니까 심심했어', 'NEUTRAL', '감정', '2026-03-24T16:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (297, 1, '걱정했어', 'NEUTRAL', '감정', '2026-03-25T18:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (298, 1, '빨리 왔네', 'POSITIVE', '일상', '2026-03-24T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (299, 1, '늦었네', 'NEUTRAL', '일상', '2026-03-23T19:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (300, 1, '나는 여기서 쉬고 있었어', 'NEUTRAL', '일상', '2026-03-25T16:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (301, 1, '트로트 듣고 있었어', 'NEUTRAL', '여가', '2026-03-25T07:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (302, 1, '야구 보고 있었어', 'NEUTRAL', '여가', '2026-03-25T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (303, 1, '낮잠 잤어', 'NEUTRAL', '일상', '2026-03-24T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (304, 1, '약 먹었어', 'NEUTRAL', '일정', '2026-03-25T10:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (305, 1, '간호사 왔다 갔어', 'NEUTRAL', '일정', '2026-03-25T11:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (306, 1, '딸이 전화했어', 'NEUTRAL', '가족', '2026-03-24T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (307, 1, '예승이가 전화했어', 'POSITIVE', '가족', '2026-03-25T17:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (308, 1, '괜찮았어', 'POSITIVE', '기분', '2026-03-25T09:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (309, 1, '별일 없었어', 'NEUTRAL', '일상', '2026-03-25T16:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (310, 1, '어깨가 좀 아팠어', 'NEGATIVE', '통증', '2026-03-25T09:00:00', NOW());

-- 기분/감정 응답형 (311~340)
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (311, 1, '오늘 기분 좋아', 'POSITIVE', '기분', '2026-03-25T09:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (312, 1, '좀 우울해', 'NEGATIVE', '기분', '2026-03-24T21:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (313, 1, '좋은 편이야', 'POSITIVE', '기분', '2026-03-25T10:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (314, 1, '나쁘지 않아', 'POSITIVE', '기분', '2026-03-24T11:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (315, 1, '힘들긴 한데 괜찮아', 'NEUTRAL', '기분', '2026-03-25T10:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (316, 1, '그래도 살만해', 'POSITIVE', '기분', '2026-03-24T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (317, 1, '예승이 생각하면 좋아', 'POSITIVE', '가족', '2026-03-25T17:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (318, 1, '야구 보면 기분 나아져', 'POSITIVE', '여가', '2026-03-25T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (319, 1, '트로트 들으면 좋아져', 'POSITIVE', '여가', '2026-03-25T07:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (320, 1, '좀 외로워', 'NEGATIVE', '감정', '2026-03-24T22:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (321, 1, '잠이 안 와서 힘들어', 'NEGATIVE', '상태', '2026-03-24T23:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (322, 1, '빨리 낫고 싶어', 'NEUTRAL', '감정', '2026-03-25T20:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (323, 1, '걷고 싶어', 'NEUTRAL', '감정', '2026-03-25T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (324, 1, '밖에 나가고 싶어', 'NEUTRAL', '감정', '2026-03-25T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (325, 1, '가족이 있어서 버텨', 'POSITIVE', '감정', '2026-03-25T20:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (326, 1, '포기하지 않을 거야', 'POSITIVE', '감정', '2026-03-24T21:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (327, 1, '오늘도 힘내자', 'POSITIVE', '기분', '2026-03-25T07:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (328, 1, '내일은 나을 거야', 'POSITIVE', '기분', '2026-03-24T22:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (329, 1, '살아있어서 좋다', 'POSITIVE', '감정', '2026-03-25T21:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (330, 1, '고마운 하루야', 'POSITIVE', '감정', '2026-03-25T21:00:00', NOW());

-- 소식/뉴스 반응형 (331~350)
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (331, 1, '진짜?', 'NEUTRAL', '일상', '2026-03-25T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (332, 1, '그래?', 'NEUTRAL', '일상', '2026-03-25T11:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (333, 1, '몰랐어', 'NEUTRAL', '일상', '2026-03-24T16:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (334, 1, '언제?', 'NEUTRAL', '일상', '2026-03-25T10:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (335, 1, '어떻게 됐어?', 'NEUTRAL', '일상', '2026-03-24T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (336, 1, '잘 됐다', 'POSITIVE', '감정', '2026-03-25T11:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (337, 1, '좋은 소식이네', 'POSITIVE', '감정', '2026-03-24T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (338, 1, '에이 아쉽다', 'NEGATIVE', '감정', '2026-03-23T20:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (339, 1, '속상하겠다', 'NEGATIVE', '감정', '2026-03-22T19:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (340, 1, '괜찮아질 거야', 'POSITIVE', '감정', '2026-03-25T09:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (341, 1, '힘내', 'POSITIVE', '감정', '2026-03-24T17:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (342, 1, '어쩔 수 없지', 'NEUTRAL', '일상', '2026-03-23T18:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (343, 1, '다음에 잘 되겠지', 'POSITIVE', '감정', '2026-03-24T16:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (344, 1, '너무 걱정하지 마', 'POSITIVE', '감정', '2026-03-25T10:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (345, 1, '기쁘다', 'POSITIVE', '감정', '2026-03-25T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (346, 1, '나도 기쁘다', 'POSITIVE', '감정', '2026-03-24T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (347, 1, '정말 다행이야', 'POSITIVE', '감정', '2026-03-25T11:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (348, 1, '기분 좋겠다', 'POSITIVE', '감정', '2026-03-24T16:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (349, 1, '대단하다', 'POSITIVE', '감정', '2026-03-23T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (350, 1, '자세히 말해줘', 'NEUTRAL', '일상', '2026-03-25T14:00:00', NOW());

-- 감사/사과/위로 응답형 (351~370)
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (351, 1, '항상 고마워', 'POSITIVE', '감정', '2026-03-25T20:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (352, 1, '걱정 끼쳐서 미안해', 'NEGATIVE', '감정', '2026-03-24T21:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (353, 1, '신경 써줘서 고마워', 'POSITIVE', '감정', '2026-03-25T09:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (354, 1, '덕분에 좋아졌어', 'POSITIVE', '감정', '2026-03-25T10:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (355, 1, '네가 있어서 좋다', 'POSITIVE', '감정', '2026-03-25T20:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (356, 1, '돌봐줘서 고마워', 'POSITIVE', '감정', '2026-03-24T20:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (357, 1, '내가 미안하지', 'NEGATIVE', '감정', '2026-03-23T21:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (358, 1, '고생시켜서 미안해', 'NEGATIVE', '감정', '2026-03-22T20:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (359, 1, '옆에 있어줘서 고마워', 'POSITIVE', '감정', '2026-03-25T21:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (360, 1, '같이 있어줘서 좋다', 'POSITIVE', '감정', '2026-03-24T20:00:00', NOW());

-- 음식 응답형 추가 (361~380)
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (361, 1, '맛있다', 'POSITIVE', '음식', '2026-03-25T08:30:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (362, 1, '잘 먹었어', 'POSITIVE', '음식', '2026-03-25T12:30:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (363, 1, '더 줘', 'NEUTRAL', '음식', '2026-03-24T08:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (364, 1, '따뜻한 거 줘', 'NEUTRAL', '음식', '2026-03-25T07:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (365, 1, '시원한 거 줘', 'NEUTRAL', '음식', '2026-03-24T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (366, 1, '물 먼저 줘', 'NEUTRAL', '음식', '2026-03-25T08:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (367, 1, '배고프긴 해', 'NEUTRAL', '음식', '2026-03-25T12:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (368, 1, '좀 있다가 먹을게', 'NEUTRAL', '음식', '2026-03-24T12:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (369, 1, '국물이 좋다', 'POSITIVE', '음식', '2026-03-25T12:30:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (370, 1, '부드러운 거 줘', 'NEUTRAL', '음식', '2026-03-24T08:00:00', NOW());

-- 일상/시간대 응답형 (371~400)
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (371, 1, '벌써 아침이야', 'NEUTRAL', '일상', '2026-03-25T07:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (372, 1, '점심 때 됐어', 'NEUTRAL', '일상', '2026-03-25T12:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (373, 1, '저녁 시간이네', 'NEUTRAL', '일상', '2026-03-25T18:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (374, 1, '이제 잘 시간이야', 'NEUTRAL', '일상', '2026-03-25T22:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (375, 1, '시간 빠르다', 'NEUTRAL', '일상', '2026-03-25T18:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (376, 1, '오늘 하루 빨랐다', 'NEUTRAL', '일상', '2026-03-25T21:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (377, 1, '날씨 좋다', 'POSITIVE', '환경', '2026-03-25T10:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (378, 1, '비 오네', 'NEUTRAL', '환경', '2026-03-24T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (379, 1, '따뜻해졌다', 'POSITIVE', '환경', '2026-03-25T11:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (380, 1, '오늘 뭐 해', 'NEUTRAL', '일상', '2026-03-25T09:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (381, 1, '심심해', 'NEUTRAL', '일상', '2026-03-25T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (382, 1, '뭐 재밌는 거 없어', 'NEUTRAL', '일상', '2026-03-24T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (383, 1, '얘기 좀 해줘', 'NEUTRAL', '일상', '2026-03-25T16:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (384, 1, '생각해볼게', 'NEUTRAL', '일상', '2026-03-24T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (385, 1, '나중에 말할게', 'NEUTRAL', '일상', '2026-03-23T16:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (386, 1, '그건 좋은데', 'POSITIVE', '일상', '2026-03-25T11:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (387, 1, '한번 해보자', 'POSITIVE', '일상', '2026-03-24T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (388, 1, '잘 모르겠어', 'NEUTRAL', '일상', '2026-03-25T10:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (389, 1, '글쎄', 'NEUTRAL', '일상', '2026-03-24T11:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (390, 1, '그럴 수도 있지', 'NEUTRAL', '일상', '2026-03-23T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (391, 1, '맞아', 'POSITIVE', '일상', '2026-03-25T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (392, 1, '그렇지', 'POSITIVE', '일상', '2026-03-24T13:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (393, 1, '나도 그래', 'POSITIVE', '일상', '2026-03-25T11:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (394, 1, '크게 말해줘', 'NEUTRAL', '요청', '2026-03-24T10:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (395, 1, '천천히 말해줘', 'NEUTRAL', '요청', '2026-03-23T11:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (396, 1, '다시 말해줘', 'NEUTRAL', '요청', '2026-03-25T10:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (397, 1, '뭐라고?', 'NEUTRAL', '일상', '2026-03-24T12:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (398, 1, '잘 안 들려', 'NEUTRAL', '일상', '2026-03-23T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (399, 1, '아까 뭐라고 했어', 'NEUTRAL', '일상', '2026-03-25T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (400, 1, '오늘도 감사해', 'POSITIVE', '감정', '2026-03-25T21:00:00', NOW());

-- ===== 상황별 응답형 200개 (id 401~600) =====

-- 보호자 자리 비움 응답 (401~420)
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (401, 1, '응 알겠어', 'POSITIVE', '일상', '2026-03-25T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (402, 1, '필요하면 부를게', 'NEUTRAL', '일상', '2026-03-25T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (403, 1, '빨리 와', 'NEUTRAL', '일상', '2026-03-24T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (404, 1, '가지 마', 'NEGATIVE', '감정', '2026-03-24T16:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (405, 1, '옆에 있어줘', 'NEUTRAL', '감정', '2026-03-25T20:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (406, 1, '혼자 있기 싫어', 'NEGATIVE', '감정', '2026-03-24T21:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (407, 1, '금방 올 거지?', 'NEUTRAL', '일상', '2026-03-25T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (408, 1, '뭐 하러 가?', 'NEUTRAL', '일상', '2026-03-24T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (409, 1, '주방에서 할 거 있어?', 'NEUTRAL', '일상', '2026-03-25T12:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (410, 1, '오래 걸려?', 'NEUTRAL', '일상', '2026-03-24T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (411, 1, '조심해', 'NEUTRAL', '일상', '2026-03-25T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (412, 1, '나 괜찮아 갔다 와', 'POSITIVE', '일상', '2026-03-25T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (413, 1, '물 좀 갖다 줘', 'NEUTRAL', '요청', '2026-03-24T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (414, 1, '가기 전에 이것만', 'NEUTRAL', '요청', '2026-03-23T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (415, 1, '문 열어놓고 가', 'NEUTRAL', '요청', '2026-03-25T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (416, 1, '나중에 같이 밥 먹자', 'POSITIVE', '음식', '2026-03-24T12:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (417, 1, '천천히 해', 'NEUTRAL', '일상', '2026-03-25T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (418, 1, '서두르지 마', 'NEUTRAL', '일상', '2026-03-24T16:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (419, 1, '어디 가는 거야?', 'NEUTRAL', '일상', '2026-03-25T11:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (420, 1, '언제 돌아와?', 'NEUTRAL', '일상', '2026-03-24T15:00:00', NOW());

-- 치료/검진 관련 응답 (421~445)
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (421, 1, '응 받을게', 'POSITIVE', '의료', '2026-03-25T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (422, 1, '아니 오늘은 안 할래', 'NEGATIVE', '의료', '2026-03-24T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (423, 1, '좀 이따가 할래', 'NEUTRAL', '의료', '2026-03-25T10:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (424, 1, '힘들어서 못 하겠어', 'NEGATIVE', '의료', '2026-03-24T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (425, 1, '오늘 물리치료 있어?', 'NEUTRAL', '일정', '2026-03-25T09:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (426, 1, '선생님 언제 와?', 'NEUTRAL', '일정', '2026-03-25T10:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (427, 1, '오늘 약 먹었어?', 'NEUTRAL', '일정', '2026-03-25T10:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (428, 1, '약 시간 됐어', 'NEUTRAL', '일정', '2026-03-25T13:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (429, 1, '경관식 할 시간이야', 'NEUTRAL', '의료', '2026-03-25T12:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (430, 1, '석션 좀 해줘', 'NEUTRAL', '의료', '2026-03-25T08:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (431, 1, '산소 확인해줘', 'NEUTRAL', '의료', '2026-03-25T07:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (432, 1, '호흡기 좀 봐줘', 'NEUTRAL', '의료', '2026-03-24T06:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (433, 1, '위루관 좀 봐줘', 'NEUTRAL', '의료', '2026-03-25T11:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (434, 1, '물리치료 효과 있어', 'POSITIVE', '의료', '2026-03-24T16:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (435, 1, '오늘 치료 힘들었어', 'NEGATIVE', '의료', '2026-03-25T16:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (436, 1, '좀 쉬고 하자', 'NEUTRAL', '의료', '2026-03-24T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (437, 1, '천천히 해줘', 'NEUTRAL', '요청', '2026-03-25T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (438, 1, '살살 해줘', 'NEUTRAL', '요청', '2026-03-24T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (439, 1, '좀 세게 해줘', 'NEUTRAL', '요청', '2026-03-23T16:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (440, 1, '거기 아파', 'NEGATIVE', '통증', '2026-03-25T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (441, 1, '거기 좋아', 'POSITIVE', '통증', '2026-03-24T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (442, 1, '거기 말고', 'NEUTRAL', '통증', '2026-03-23T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (443, 1, '좀 더 해줘', 'NEUTRAL', '요청', '2026-03-25T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (444, 1, '됐어 그만', 'NEUTRAL', '요청', '2026-03-24T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (445, 1, '고마워 시원하다', 'POSITIVE', '감정', '2026-03-25T15:00:00', NOW());

-- 잠/수면 관련 (446~465)
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (446, 1, '잘 잤어', 'POSITIVE', '상태', '2026-03-25T07:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (447, 1, '못 잤어', 'NEGATIVE', '상태', '2026-03-24T07:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (448, 1, '새벽에 깼어', 'NEGATIVE', '상태', '2026-03-23T07:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (449, 1, '계속 뒤척였어', 'NEGATIVE', '상태', '2026-03-22T07:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (450, 1, '졸려', 'NEUTRAL', '상태', '2026-03-25T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (451, 1, '낮잠 잘래', 'NEUTRAL', '상태', '2026-03-25T13:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (452, 1, '잠이 안 와', 'NEGATIVE', '상태', '2026-03-24T23:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (453, 1, '불 꺼줘', 'NEUTRAL', '요청', '2026-03-25T22:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (454, 1, '이불 덮어줘', 'NEUTRAL', '요청', '2026-03-25T22:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (455, 1, '조용히 해줘', 'NEUTRAL', '요청', '2026-03-24T22:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (456, 1, '좀 더 잘게', 'NEUTRAL', '상태', '2026-03-25T07:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (457, 1, '깨워줘서 고마워', 'POSITIVE', '감정', '2026-03-25T07:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (458, 1, '아직 졸려', 'NEUTRAL', '상태', '2026-03-24T07:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (459, 1, '일어날게', 'NEUTRAL', '일상', '2026-03-25T07:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (460, 1, '꿈 꿨어', 'NEUTRAL', '일상', '2026-03-24T07:00:00', NOW());

-- 환경/온도 응답형 (461~480)
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (461, 1, '응 더워', 'NEGATIVE', '환경', '2026-03-25T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (462, 1, '응 추워', 'NEGATIVE', '환경', '2026-03-25T07:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (463, 1, '아니 괜찮아', 'POSITIVE', '환경', '2026-03-24T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (464, 1, '에어컨 켜줘', 'NEUTRAL', '요청', '2026-03-25T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (465, 1, '히터 켜줘', 'NEUTRAL', '요청', '2026-03-24T07:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (466, 1, '창문 좀 열어줘', 'NEUTRAL', '요청', '2026-03-25T10:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (467, 1, '창문 닫아줘', 'NEUTRAL', '요청', '2026-03-24T18:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (468, 1, '바람 들어와', 'NEUTRAL', '환경', '2026-03-25T10:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (469, 1, '공기 좋다', 'POSITIVE', '환경', '2026-03-25T10:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (470, 1, '환기 좀 해줘', 'NEUTRAL', '요청', '2026-03-24T10:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (471, 1, '이불 벗겨줘', 'NEUTRAL', '요청', '2026-03-25T07:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (472, 1, '땀 닦아줘', 'NEUTRAL', '요청', '2026-03-25T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (473, 1, '손발이 차가워', 'NEGATIVE', '통증', '2026-03-24T22:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (474, 1, '몸이 뜨거워', 'NEGATIVE', '통증', '2026-03-25T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (475, 1, '열 나는 것 같아', 'NEGATIVE', '통증', '2026-03-24T16:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (476, 1, '시원해졌어', 'POSITIVE', '환경', '2026-03-25T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (477, 1, '따뜻해졌어', 'POSITIVE', '환경', '2026-03-25T07:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (478, 1, '딱 좋아', 'POSITIVE', '환경', '2026-03-24T10:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (479, 1, '아직 추워', 'NEGATIVE', '환경', '2026-03-23T07:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (480, 1, '아직 더워', 'NEGATIVE', '환경', '2026-03-23T14:00:00', NOW());

-- 위생/세면 응답형 (481~500)
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (481, 1, '응 씻겨줘', 'NEUTRAL', '요청', '2026-03-25T08:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (482, 1, '양치해줘', 'NEUTRAL', '요청', '2026-03-25T07:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (483, 1, '세수해줘', 'NEUTRAL', '요청', '2026-03-25T07:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (484, 1, '입 좀 적셔줘', 'NEUTRAL', '요청', '2026-03-25T10:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (485, 1, '입술 발라줘', 'NEUTRAL', '요청', '2026-03-24T11:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (486, 1, '눈 닦아줘', 'NEUTRAL', '요청', '2026-03-25T07:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (487, 1, '코 풀어줘', 'NEUTRAL', '요청', '2026-03-24T09:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (488, 1, '머리 감겨줘', 'NEUTRAL', '요청', '2026-03-23T08:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (489, 1, '옷 갈아입혀줘', 'NEUTRAL', '요청', '2026-03-25T08:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (490, 1, '상쾌하다', 'POSITIVE', '기분', '2026-03-25T08:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (491, 1, '개운해졌어', 'POSITIVE', '기분', '2026-03-24T08:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (492, 1, '나중에 씻을래', 'NEUTRAL', '일상', '2026-03-23T09:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (493, 1, '물티슈 줘', 'NEUTRAL', '요청', '2026-03-25T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (494, 1, '수건 줘', 'NEUTRAL', '요청', '2026-03-24T08:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (495, 1, '가려워', 'NEGATIVE', '통증', '2026-03-25T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (496, 1, '긁어줘', 'NEUTRAL', '요청', '2026-03-24T16:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (497, 1, '거기 가려워', 'NEGATIVE', '통증', '2026-03-23T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (498, 1, '시원하다', 'POSITIVE', '기분', '2026-03-25T08:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (499, 1, '깨끗해졌어', 'POSITIVE', '기분', '2026-03-24T08:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (500, 1, '고마워 씻겨줘서', 'POSITIVE', '감정', '2026-03-25T08:00:00', NOW());

-- 예승이 상황별 응답 (501~525)
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (501, 1, '예승이 보고 싶다', 'POSITIVE', '가족', '2026-03-25T17:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (502, 1, '예승이 얼굴 보고 싶어', 'POSITIVE', '가족', '2026-03-25T18:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (503, 1, '예승이 뭐 한대?', 'NEUTRAL', '가족', '2026-03-24T17:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (504, 1, '예승이 잘 먹어?', 'NEUTRAL', '가족', '2026-03-24T12:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (505, 1, '예승이 선물 사줘', 'POSITIVE', '가족', '2026-03-23T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (506, 1, '예승이한테 사탕 줘', 'POSITIVE', '가족', '2026-03-22T16:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (507, 1, '예승이 크면 뭐 될까', 'NEUTRAL', '가족', '2026-03-25T20:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (508, 1, '예승이 닮았어', 'POSITIVE', '가족', '2026-03-24T17:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (509, 1, '예승이 영상 보여줘', 'NEUTRAL', '가족', '2026-03-25T17:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (510, 1, '예승이가 보낸 거야?', 'NEUTRAL', '가족', '2026-03-24T16:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (511, 1, '예승이 목소리 듣고 싶어', 'POSITIVE', '가족', '2026-03-25T19:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (512, 1, '예승이가 보고싶대?', 'POSITIVE', '가족', '2026-03-25T18:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (513, 1, '나도 보고 싶어', 'POSITIVE', '가족', '2026-03-25T18:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (514, 1, '예승이 데리고 와줘', 'NEUTRAL', '가족', '2026-03-24T17:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (515, 1, '예승이랑 통화하고 싶어', 'POSITIVE', '가족', '2026-03-25T19:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (516, 1, '예승이가 그렸어?', 'POSITIVE', '가족', '2026-03-24T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (517, 1, '예승이 잘 컸다', 'POSITIVE', '가족', '2026-03-23T17:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (518, 1, '예승이가 자랑스러워', 'POSITIVE', '가족', '2026-03-25T20:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (519, 1, '예승이 건강하지?', 'NEUTRAL', '가족', '2026-03-24T18:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (520, 1, '예승이한테 할아버지 사랑한다고 해', 'POSITIVE', '가족', '2026-03-25T21:00:00', NOW());

-- 롯데 상황별 응답 (521~545)
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (521, 1, '오늘 경기 몇 시야?', 'NEUTRAL', '여가', '2026-03-25T13:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (522, 1, '스코어 알려줘', 'NEUTRAL', '여가', '2026-03-25T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (523, 1, '누가 이기고 있어?', 'NEUTRAL', '여가', '2026-03-24T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (524, 1, '몇 회야?', 'NEUTRAL', '여가', '2026-03-25T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (525, 1, '오늘 누가 던져?', 'NEUTRAL', '여가', '2026-03-25T13:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (526, 1, '타순 어떻게 돼?', 'NEUTRAL', '여가', '2026-03-24T13:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (527, 1, '전준우 오늘 어때?', 'NEUTRAL', '여가', '2026-03-25T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (528, 1, '김원중 오늘 던져?', 'NEUTRAL', '여가', '2026-03-24T13:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (529, 1, '좋다 이겼어', 'POSITIVE', '여가', '2026-03-25T21:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (530, 1, '에이 졌네', 'NEGATIVE', '여가', '2026-03-24T21:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (531, 1, '아깝다 다음에 이기자', 'POSITIVE', '여가', '2026-03-23T22:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (532, 1, '오늘은 재밌었어', 'POSITIVE', '여가', '2026-03-25T21:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (533, 1, '야구 없는 날은 심심해', 'NEUTRAL', '여가', '2026-03-22T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (534, 1, '내년에는 우승하자', 'POSITIVE', '여가', '2026-03-21T21:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (535, 1, '최동원 때가 좋았어', 'NEUTRAL', '여가', '2026-03-20T15:00:00', NOW());

-- 음식 상황별 응답 (536~560)
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (536, 1, '오렌지 주스 줘', 'NEUTRAL', '음식', '2026-03-25T10:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (537, 1, '초코우유 줘', 'NEUTRAL', '음식', '2026-03-25T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (538, 1, '계란죽 해줘', 'NEUTRAL', '음식', '2026-03-25T08:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (539, 1, '뜨거운 거 줘', 'NEUTRAL', '음식', '2026-03-24T07:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (540, 1, '찬 거 줘', 'NEUTRAL', '음식', '2026-03-25T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (541, 1, '국물 있는 거 먹고 싶어', 'NEUTRAL', '음식', '2026-03-24T12:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (542, 1, '부드러운 거 먹고 싶어', 'NEUTRAL', '음식', '2026-03-25T08:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (543, 1, '그거 맛있었어', 'POSITIVE', '음식', '2026-03-24T12:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (544, 1, '그거 별로였어', 'NEGATIVE', '음식', '2026-03-23T12:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (545, 1, '다른 거 먹고 싶어', 'NEUTRAL', '음식', '2026-03-24T12:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (546, 1, '이거 뭐야?', 'NEUTRAL', '음식', '2026-03-25T12:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (547, 1, '오늘 뭐 먹어?', 'NEUTRAL', '음식', '2026-03-25T12:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (548, 1, '간식 먹고 싶어', 'NEUTRAL', '음식', '2026-03-25T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (549, 1, '물 좀 줘', 'NEUTRAL', '요청', '2026-03-25T10:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (550, 1, '따뜻한 물 줘', 'NEUTRAL', '요청', '2026-03-25T07:00:00', NOW());

-- 가족 일반 응답형 (551~575)
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (551, 1, '딸 잘 지내?', 'NEUTRAL', '가족', '2026-03-25T17:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (552, 1, '아들 뭐 하고 있어?', 'NEUTRAL', '가족', '2026-03-24T18:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (553, 1, '집사람 밥은 먹었어?', 'NEUTRAL', '가족', '2026-03-25T12:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (554, 1, '가족 사진 보여줘', 'NEUTRAL', '가족', '2026-03-24T17:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (555, 1, '다들 건강하지?', 'NEUTRAL', '가족', '2026-03-25T18:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (556, 1, '가족이 제일이야', 'POSITIVE', '가족', '2026-03-25T20:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (557, 1, '다 같이 모이고 싶다', 'POSITIVE', '가족', '2026-03-24T19:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (558, 1, '집에 가고 싶어', 'NEUTRAL', '감정', '2026-03-25T20:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (559, 1, '걱정하지 말라고 전해줘', 'NEUTRAL', '가족', '2026-03-24T18:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (560, 1, '잘 지내고 있다고 전해줘', 'POSITIVE', '가족', '2026-03-25T18:00:00', NOW());

-- 기타 상황별 응답 (561~600)
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (561, 1, '뉴스에 뭐 나와?', 'NEUTRAL', '일상', '2026-03-25T09:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (562, 1, '오늘 몇 일이야?', 'NEUTRAL', '일상', '2026-03-25T09:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (563, 1, '밖에 뭐 보여?', 'NEUTRAL', '일상', '2026-03-25T10:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (564, 1, '오늘 뭐 입었어?', 'NEUTRAL', '일상', '2026-03-25T08:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (565, 1, '핸드폰 보여줘', 'NEUTRAL', '요청', '2026-03-25T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (566, 1, '거울 보여줘', 'NEUTRAL', '요청', '2026-03-24T08:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (567, 1, '리모컨 줘', 'NEUTRAL', '요청', '2026-03-25T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (568, 1, '채널 돌려줘', 'NEUTRAL', '요청', '2026-03-24T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (569, 1, '안경 줘', 'NEUTRAL', '요청', '2026-03-25T07:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (570, 1, '전등 좀 밝게 해줘', 'NEUTRAL', '요청', '2026-03-25T19:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (571, 1, '전등 좀 어둡게 해줘', 'NEUTRAL', '요청', '2026-03-25T22:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (572, 1, '커튼 쳐줘', 'NEUTRAL', '요청', '2026-03-25T22:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (573, 1, '커튼 열어줘', 'NEUTRAL', '요청', '2026-03-25T07:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (574, 1, '뭐 좀 먹고 싶어', 'NEUTRAL', '음식', '2026-03-25T11:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (575, 1, '배 안 고파', 'NEUTRAL', '음식', '2026-03-24T12:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (576, 1, '얘기 좀 해줘', 'NEUTRAL', '일상', '2026-03-25T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (577, 1, '조용히 있고 싶어', 'NEUTRAL', '일상', '2026-03-24T20:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (578, 1, '뭐 하고 있었어?', 'NEUTRAL', '일상', '2026-03-25T16:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (579, 1, '오늘 좀 지루해', 'NEUTRAL', '기분', '2026-03-25T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (580, 1, '할 게 없어', 'NEUTRAL', '일상', '2026-03-24T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (581, 1, '산책하고 싶어', 'NEUTRAL', '일상', '2026-03-25T10:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (582, 1, '햇빛 쬐고 싶어', 'NEUTRAL', '일상', '2026-03-25T10:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (583, 1, '밖에 나가고 싶어', 'NEUTRAL', '감정', '2026-03-24T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (584, 1, '예전처럼 되고 싶어', 'NEUTRAL', '감정', '2026-03-25T21:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (585, 1, '웃어야지', 'POSITIVE', '감정', '2026-03-25T09:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (586, 1, '뭐라고?', 'NEUTRAL', '일상', '2026-03-25T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (587, 1, '잘 안 들려', 'NEUTRAL', '일상', '2026-03-24T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (588, 1, '다시 말해줘', 'NEUTRAL', '요청', '2026-03-25T10:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (589, 1, '크게 말해줘', 'NEUTRAL', '요청', '2026-03-24T11:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (590, 1, '천천히 말해줘', 'NEUTRAL', '요청', '2026-03-23T10:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (591, 1, '그래서?', 'NEUTRAL', '일상', '2026-03-25T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (592, 1, '그 다음에?', 'NEUTRAL', '일상', '2026-03-24T15:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (593, 1, '정말?', 'NEUTRAL', '일상', '2026-03-25T11:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (594, 1, '대단하다', 'POSITIVE', '감정', '2026-03-24T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (595, 1, '그건 아니야', 'NEGATIVE', '일상', '2026-03-23T16:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (596, 1, '맞아 맞아', 'POSITIVE', '일상', '2026-03-25T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (597, 1, '그렇지', 'POSITIVE', '일상', '2026-03-24T13:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (598, 1, '나도 그 생각이야', 'POSITIVE', '일상', '2026-03-25T11:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (599, 1, '글쎄다', 'NEUTRAL', '일상', '2026-03-24T14:00:00', NOW());
INSERT IGNORE INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at) VALUES (600, 1, '잘 모르겠어', 'NEUTRAL', '일상', '2026-03-25T10:00:00', NOW());

-- 추가 USAGE_LOG (191~200)
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 191, 4, '2026-03-25T15:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 192, 4, '2026-03-25T17:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 193, 5, '2026-03-24T18:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 194, 4, '2026-03-25T16:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 195, 3, '2026-03-24T14:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 196, 5, '2026-03-23T19:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 197, 4, '2026-03-25T17:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 198, 5, '2026-03-24T20:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 199, 3, '2026-03-23T14:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 200, 5, '2026-03-24T20:00:00');

-- 추가 USAGE_LOG (173~190)
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 173, 4, '2026-03-25T15:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 174, 4, '2026-03-25T16:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 175, 4, '2026-03-24T17:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 176, 4, '2026-03-24T15:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 177, 3, '2026-03-25T14:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 178, 2, '2026-03-25T11:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 179, 4, '2026-03-24T16:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 180, 4, '2026-03-23T15:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 181, 2, '2026-03-25T10:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 182, 3, '2026-03-24T14:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 183, 5, '2026-03-23T20:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 184, 5, '2026-03-22T19:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 185, 2, '2026-03-25T09:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 186, 2, '2026-03-25T11:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 187, 3, '2026-03-24T12:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 188, 3, '2026-03-25T12:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 189, 3, '2026-03-24T13:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 190, 5, '2026-03-25T18:00:00');

-- 추가 USAGE_LOG (146~172)
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 146, 2, '2026-03-25T09:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 147, 2, '2026-03-25T10:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 148, 1, '2026-03-25T08:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 149, 4, '2026-03-24T16:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 150, 1, '2026-03-25T07:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 151, 2, '2026-03-24T11:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 152, 1, '2026-03-25T07:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 153, 3, '2026-03-25T12:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 154, 5, '2026-03-25T18:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 155, 6, '2026-03-24T22:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 156, 2, '2026-03-25T10:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 157, 3, '2026-03-25T13:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 158, 5, '2026-03-25T19:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 159, 2, '2026-03-25T10:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 160, 3, '2026-03-24T14:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 161, 4, '2026-03-23T15:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 162, 2, '2026-03-25T11:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 163, 4, '2026-03-25T17:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 164, 5, '2026-03-24T18:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 165, 4, '2026-03-23T17:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 166, 4, '2026-03-22T16:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 167, 3, '2026-03-25T14:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 168, 5, '2026-03-25T20:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 169, 6, '2026-03-24T21:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 170, 2, '2026-03-25T09:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 171, 4, '2026-03-24T15:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 172, 4, '2026-03-23T16:00:00');

-- 추가 USAGE_LOG (121~145)
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 121, 4, '2026-03-24T15:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 122, 4, '2026-03-24T15:30:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 123, 4, '2026-03-24T16:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 124, 6, '2026-03-23T21:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 125, 5, '2026-03-23T20:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 126, 6, '2026-03-22T21:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 127, 6, '2026-03-22T22:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 128, 6, '2026-03-21T21:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 129, 4, '2026-03-24T15:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 130, 4, '2026-03-24T15:30:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 131, 2, '2026-03-24T10:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 132, 2, '2026-03-23T10:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 133, 2, '2026-03-23T11:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 134, 1, '2026-03-24T08:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 135, 1, '2026-03-24T08:30:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 136, 3, '2026-03-23T12:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 137, 3, '2026-03-22T12:30:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 138, 2, '2026-03-24T09:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 139, 2, '2026-03-24T09:30:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 140, 2, '2026-03-23T10:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 141, 2, '2026-03-24T11:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 142, 3, '2026-03-23T14:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 143, 2, '2026-03-24T10:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 144, 4, '2026-03-23T15:00:00');
INSERT IGNORE INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 145, 5, '2026-03-24T20:00:00');

-- 추가 USAGE_LOG (91~120)
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 91, 2, '2026-03-24T10:50:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 92, 2, '2026-03-23T11:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 93, 2, '2026-03-24T09:30:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 94, 3, '2026-03-24T12:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 95, 3, '2026-03-23T12:30:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 96, 3, '2026-03-22T12:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 97, 3, '2026-03-23T13:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 98, 3, '2026-03-22T12:30:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 99, 1, '2026-03-24T08:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 100, 1, '2026-03-24T07:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 101, 1, '2026-03-23T08:30:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 102, 2, '2026-03-23T09:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 103, 1, '2026-03-24T08:30:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 104, 1, '2026-03-23T08:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 105, 2, '2026-03-22T09:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 106, 2, '2026-03-21T10:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 107, 1, '2026-03-24T06:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 108, 1, '2026-03-23T06:30:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 109, 1, '2026-03-22T07:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 110, 2, '2026-03-24T09:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 111, 3, '2026-03-24T14:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 112, 1, '2026-03-23T06:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 113, 2, '2026-03-24T10:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 114, 2, '2026-03-24T11:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 115, 5, '2026-03-23T18:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 116, 4, '2026-03-22T17:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 117, 1, '2026-03-24T08:30:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 118, 3, '2026-03-23T14:30:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 119, 5, '2026-03-22T20:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 120, 6, '2026-03-24T21:00:00');

-- 자주 쓰는 의료 표현 usage_log 추가
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 99, 1, '2026-03-23T07:30:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 99, 2, '2026-03-22T10:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 91, 2, '2026-03-23T11:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 91, 3, '2026-03-22T13:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 107, 1, '2026-03-23T06:00:00');

-- 4. EXPRESSION_KEYWORDS
-- 통증
INSERT INTO expression_keywords (expr_id, keyword) VALUES (1, '왼쪽');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (1, '어깨');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (1, '저리다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (2, '어깨');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (2, '주무르다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (3, '왼쪽');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (3, '어깨');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (3, '아프다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (4, '어깨');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (4, '찜질');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (5, '오른쪽');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (5, '다리');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (5, '아프다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (6, '다리');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (6, '올리다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (7, '다리');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (7, '저리다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (8, '허리');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (8, '불편하다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (9, '허리');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (9, '받치다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (10, '몸');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (10, '뻐근하다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (11, '어깨');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (11, '낫다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (12, '진통제');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (13, '마사지');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (14, '목');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (14, '아프다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (15, '등');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (15, '시리다');

-- 손녀딸/가족
INSERT INTO expression_keywords (expr_id, keyword) VALUES (16, '예승');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (16, '보고 싶다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (17, '예승');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (17, '오다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (18, '예승');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (18, '학교');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (19, '예승');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (19, '오다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (20, '예승');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (20, '생각나다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (21, '예승');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (21, '사진');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (22, '예승');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (22, '전화');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (23, '예승');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (23, '편지');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (24, '딸');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (24, '오다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (25, '아들');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (26, '집사람');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (27, '가족');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (27, '보고 싶다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (28, '고맙다');

-- 야구/롯데
INSERT INTO expression_keywords (expr_id, keyword) VALUES (29, '롯데');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (29, '경기');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (30, '야구');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (30, '보다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (31, '야구');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (31, '중계');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (32, '롯데');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (32, '이기다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (33, '롯데');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (33, '지다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (34, '선발');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (35, '사직구장');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (36, '야구');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (36, '결과');

-- 트로트
INSERT INTO expression_keywords (expr_id, keyword) VALUES (37, '트로트');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (38, '트로트');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (38, '듣다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (39, '노래');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (39, '좋다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (40, '나훈아');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (40, '노래');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (41, '노래');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (41, '편하다');

-- 음식
INSERT INTO expression_keywords (expr_id, keyword) VALUES (42, '참기름죽');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (42, '먹다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (43, '죽');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (43, '맛있다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (44, '밥');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (44, '시간');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (45, '배고프다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (46, '물');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (46, '주다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (47, '목');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (47, '마르다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (48, '김치찌개');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (48, '먹다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (49, '국밥');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (49, '먹다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (50, '맛있다');

-- 기분/감정
INSERT INTO expression_keywords (expr_id, keyword) VALUES (51, '기분');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (51, '괜찮다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (52, '기분');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (52, '좋다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (53, '우울하다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (54, '힘들다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (55, '괜찮다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (56, '낫다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (57, '피곤하다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (58, '잠');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (59, '외롭다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (60, '답답하다');

-- 일상
INSERT INTO expression_keywords (expr_id, keyword) VALUES (61, '약');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (61, '시간');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (62, '물리치료');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (63, '치료');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (64, '자세');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (64, '바꾸다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (65, '베개');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (65, '높이다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (66, '창문');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (66, '열다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (67, '불');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (67, '끄다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (68, 'TV');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (69, '돕다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (70, '낫다');

-- 추가 EXPRESSIONS: 페르소나 디테일 (선수/가수/음식)
-- 야구 선수
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (71, 1, '전준우 오늘 잘 쳤어', 'POSITIVE', '여가', '2026-03-24T15:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (72, 1, '전준우 타율 어때', 'NEUTRAL', '여가', '2026-03-23T14:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (73, 1, '김원중 오늘 등판해', 'NEUTRAL', '여가', '2026-03-24T13:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (74, 1, '김원중 잘 던졌어', 'POSITIVE', '여가', '2026-03-23T21:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (75, 1, '최동원 같은 투수가 또 나올까', 'NEUTRAL', '여가', '2026-03-22T14:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (76, 1, '최동원이 최고였어', 'POSITIVE', '여가', '2026-03-21T15:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (77, 1, '예전에 최동원 경기 직접 봤어', 'POSITIVE', '여가', '2026-03-20T14:00:00', NOW());

-- 트로트 가수
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (78, 1, '나훈아 테스형 틀어줘', 'POSITIVE', '여가', '2026-03-24T07:30:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (79, 1, '임영웅 노래 듣고 싶어', 'POSITIVE', '여가', '2026-03-23T08:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (80, 1, '임영웅 노래 좋다', 'POSITIVE', '여가', '2026-03-22T07:30:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (81, 1, '나훈아가 제일 좋아', 'POSITIVE', '여가', '2026-03-24T07:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (82, 1, '임영웅 콘서트 가고 싶다', 'POSITIVE', '여가', '2026-03-21T09:00:00', NOW());

-- 음식 디테일
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (83, 1, '오렌지 주스 마시고 싶어', 'POSITIVE', '음식', '2026-03-24T10:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (84, 1, '오렌지 주스 맛있어', 'POSITIVE', '음식', '2026-03-23T10:30:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (85, 1, '계란죽 먹고 싶어', 'POSITIVE', '음식', '2026-03-24T08:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (86, 1, '계란죽 부드러워서 좋아', 'POSITIVE', '음식', '2026-03-23T08:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (87, 1, '초코우유 줘', 'NEUTRAL', '음식', '2026-03-24T15:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (88, 1, '초코우유 마시고 싶어', 'POSITIVE', '음식', '2026-03-23T15:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (89, 1, '오렌지 주스 한 잔만', 'NEUTRAL', '음식', '2026-03-22T11:00:00', NOW());
INSERT INTO expressions (id, matching_id, content, sentiment, category, last_used, created_at)
VALUES (90, 1, '오늘 계란죽이야', 'NEUTRAL', '음식', '2026-03-24T08:30:00', NOW());

-- 추가 EXPRESSION_KEYWORDS
INSERT INTO expression_keywords (expr_id, keyword) VALUES (71, '전준우');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (71, '치다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (72, '전준우');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (72, '타율');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (73, '김원중');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (73, '등판');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (74, '김원중');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (74, '던지다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (75, '최동원');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (75, '투수');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (76, '최동원');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (76, '최고');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (77, '최동원');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (77, '경기');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (78, '나훈아');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (78, '테스형');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (79, '임영웅');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (79, '노래');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (80, '임영웅');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (80, '좋다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (81, '나훈아');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (81, '좋다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (82, '임영웅');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (82, '콘서트');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (83, '오렌지 주스');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (83, '마시다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (84, '오렌지 주스');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (84, '맛있다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (85, '계란죽');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (85, '먹다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (86, '계란죽');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (86, '부드럽다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (87, '초코우유');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (88, '초코우유');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (88, '마시다');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (89, '오렌지 주스');
INSERT INTO expression_keywords (expr_id, keyword) VALUES (90, '계란죽');

-- 추가 USAGE_LOG (새 expressions)
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 71, 4, '2026-03-24T15:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 72, 3, '2026-03-23T14:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 73, 3, '2026-03-24T13:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 74, 6, '2026-03-23T21:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 75, 3, '2026-03-22T14:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 76, 4, '2026-03-21T15:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 77, 3, '2026-03-20T14:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 78, 1, '2026-03-24T07:30:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 79, 1, '2026-03-23T08:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 80, 1, '2026-03-22T07:30:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 81, 1, '2026-03-24T07:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 82, 2, '2026-03-21T09:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 83, 2, '2026-03-24T10:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 84, 2, '2026-03-23T10:30:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 85, 1, '2026-03-24T08:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 86, 1, '2026-03-23T08:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 87, 4, '2026-03-24T15:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 88, 4, '2026-03-23T15:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 89, 2, '2026-03-22T11:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 90, 1, '2026-03-24T08:30:00');

-- 자주 쓰는 표현 usage_log 추가 (오렌지 주스, 나훈아, 전준우)
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 83, 3, '2026-03-23T14:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 83, 4, '2026-03-22T16:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 78, 1, '2026-03-23T07:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 78, 1, '2026-03-22T07:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 71, 3, '2026-03-23T14:30:00');

-- 5. USAGE_LOG
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 1, 1, '2026-03-24T08:30:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 2, 2, '2026-03-24T09:15:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 3, 2, '2026-03-23T10:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 4, 3, '2026-03-23T14:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 5, 2, '2026-03-24T11:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 6, 4, '2026-03-23T15:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 7, 4, '2026-03-22T16:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 8, 1, '2026-03-24T07:30:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 9, 1, '2026-03-23T08:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 10, 5, '2026-03-22T20:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 11, 2, '2026-03-21T09:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 12, 2, '2026-03-24T10:30:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 13, 4, '2026-03-23T16:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 14, 2, '2026-03-22T11:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 15, 1, '2026-03-21T06:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 16, 5, '2026-03-24T18:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 17, 2, '2026-03-24T10:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 18, 2, '2026-03-23T09:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 19, 4, '2026-03-23T17:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 20, 5, '2026-03-22T19:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 21, 3, '2026-03-22T14:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 22, 5, '2026-03-21T18:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 23, 4, '2026-03-20T15:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 24, 2, '2026-03-23T11:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 25, 5, '2026-03-22T20:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 26, 3, '2026-03-24T12:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 27, 6, '2026-03-21T21:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 28, 2, '2026-03-24T09:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 29, 3, '2026-03-24T13:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 30, 3, '2026-03-24T14:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 31, 3, '2026-03-24T14:30:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 32, 6, '2026-03-23T21:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 33, 6, '2026-03-22T21:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 34, 3, '2026-03-24T13:30:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 35, 4, '2026-03-20T15:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 36, 6, '2026-03-23T22:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 37, 1, '2026-03-24T07:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 38, 1, '2026-03-24T06:30:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 39, 1, '2026-03-23T07:30:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 40, 1, '2026-03-22T07:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 41, 1, '2026-03-23T08:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 42, 1, '2026-03-24T08:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 43, 1, '2026-03-23T08:30:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 44, 3, '2026-03-24T12:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 45, 2, '2026-03-24T11:30:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 46, 2, '2026-03-24T10:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 47, 4, '2026-03-23T15:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 48, 3, '2026-03-22T12:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 49, 3, '2026-03-21T12:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 50, 1, '2026-03-24T08:30:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 51, 2, '2026-03-24T09:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 52, 3, '2026-03-23T14:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 53, 6, '2026-03-22T21:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 54, 5, '2026-03-23T20:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 55, 2, '2026-03-24T10:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 56, 2, '2026-03-24T11:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 57, 6, '2026-03-23T22:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 58, 6, '2026-03-22T23:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 59, 6, '2026-03-21T22:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 60, 4, '2026-03-22T16:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 61, 2, '2026-03-24T10:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 62, 3, '2026-03-24T14:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 63, 2, '2026-03-23T09:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 64, 4, '2026-03-24T15:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 65, 6, '2026-03-23T21:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 66, 2, '2026-03-24T10:30:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 67, 6, '2026-03-23T22:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 68, 3, '2026-03-24T14:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 69, 2, '2026-03-23T11:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 70, 5, '2026-03-24T20:00:00');

-- 자주 쓰는 표현은 usage_log 추가 (왼쪽 어깨, 예승이, 트로트)
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 1, 2, '2026-03-23T09:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 1, 4, '2026-03-22T15:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 1, 5, '2026-03-21T19:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 3, 1, '2026-03-22T08:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 3, 5, '2026-03-21T18:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 16, 4, '2026-03-23T16:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 16, 6, '2026-03-22T21:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 37, 1, '2026-03-23T07:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 37, 1, '2026-03-22T07:00:00');
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at) VALUES (1, 46, 3, '2026-03-23T14:00:00');

-- 6. USER_WORDS (matching_id=1) — 박윤환 페르소나
INSERT IGNORE INTO user_words (matching_id, subjects, objects, verbs, created_at, updated_at)
VALUES (1,
  '["나", "우리", "예승이", "딸", "아들", "집사람", "가족", "간호사", "선생님", "롯데", "전준우", "김원중", "최동원", "나훈아", "임영웅", "어깨", "왼쪽 어깨", "오른쪽 다리", "허리", "다리", "목", "등", "몸"]',
  '["물", "약", "밥", "죽", "계란죽", "오렌지 주스", "초코우유", "김치찌개", "국밥", "된장찌개", "과일", "커피", "트로트", "야구", "TV", "전화", "사진", "편지", "창문", "불", "베개", "진통제", "찜질", "마사지", "경기", "노래"]',
  '["좋아하다", "보고 싶다", "먹다", "마시다", "보다", "듣다", "틀다", "아프다", "저리다", "불편하다", "힘들다", "괜찮다", "좋다", "나아지다", "주다", "해주다", "올리다", "바꾸다", "열다", "끄다", "켜다", "받다", "던지다", "치다", "이기다", "응원하다"]',
  NOW(), NOW());

-- 7. DAILY_MOOD
INSERT IGNORE INTO daily_mood (matching_id, mood_date, mood_type, mood_level, created_at)
VALUES (1, DATE_SUB(CURDATE(), INTERVAL 1 DAY), 'CALM', 3, NOW());
