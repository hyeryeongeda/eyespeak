-- ============================================
-- EyeSpeak 시드 데이터
-- ddl-auto: create 환경에서 앱 기동 시 자동 실행
-- ============================================

-- ============================
-- TIME_SLOT (7행, 고정 ID)
-- ============================
INSERT INTO time_slot (id, name, start_time, end_time) VALUES (1, '기상/아침', '06:00:00', '09:00:00');
INSERT INTO time_slot (id, name, start_time, end_time) VALUES (2, '오전', '09:00:00', '12:00:00');
INSERT INTO time_slot (id, name, start_time, end_time) VALUES (3, '점심/낮', '12:00:00', '15:00:00');
INSERT INTO time_slot (id, name, start_time, end_time) VALUES (4, '오후', '15:00:00', '18:00:00');
INSERT INTO time_slot (id, name, start_time, end_time) VALUES (5, '저녁', '18:00:00', '21:00:00');
INSERT INTO time_slot (id, name, start_time, end_time) VALUES (6, '취침 준비', '21:00:00', '00:00:00');
INSERT INTO time_slot (id, name, start_time, end_time) VALUES (7, '야간', '00:00:00', '06:00:00');

-- ============================
-- ACTIVITY_TAG (11행, 고정 ID)
-- ============================
INSERT INTO activity_tag (id, name, order_index) VALUES (1, '경관식/수분 섭취', 1);
INSERT INTO activity_tag (id, name, order_index) VALUES (2, '약물 투여', 2);
INSERT INTO activity_tag (id, name, order_index) VALUES (3, '구강 케어', 3);
INSERT INTO activity_tag (id, name, order_index) VALUES (4, '체위 변경', 4);
INSERT INTO activity_tag (id, name, order_index) VALUES (5, '흡인/호흡 케어', 5);
INSERT INTO activity_tag (id, name, order_index) VALUES (6, '배변/배뇨 케어', 6);
INSERT INTO activity_tag (id, name, order_index) VALUES (7, '재활/ROM 운동', 7);
INSERT INTO activity_tag (id, name, order_index) VALUES (8, '세면/위생', 8);
INSERT INTO activity_tag (id, name, order_index) VALUES (9, '영상 시청', 9);
INSERT INTO activity_tag (id, name, order_index) VALUES (10, '외부인 방문', 10);
INSERT INTO activity_tag (id, name, order_index) VALUES (11, '휴식/수면', 11);

-- ============================
-- CATEGORY (11행, AUTO_INCREMENT)
-- depth=0 최상위, parent_id=NULL
-- ============================
INSERT INTO category (name, depth, order_index, created_at) VALUES ('석션 (가래/침)', 0, 1, NOW());
INSERT INTO category (name, depth, order_index, created_at) VALUES ('호흡', 0, 2, NOW());
INSERT INTO category (name, depth, order_index, created_at) VALUES ('통증', 0, 3, NOW());
INSERT INTO category (name, depth, order_index, created_at) VALUES ('자세', 0, 4, NOW());
INSERT INTO category (name, depth, order_index, created_at) VALUES ('체온/환경', 0, 5, NOW());
INSERT INTO category (name, depth, order_index, created_at) VALUES ('구강/식사', 0, 6, NOW());
INSERT INTO category (name, depth, order_index, created_at) VALUES ('배변/배뇨', 0, 7, NOW());
INSERT INTO category (name, depth, order_index, created_at) VALUES ('수면/피로', 0, 8, NOW());
INSERT INTO category (name, depth, order_index, created_at) VALUES ('감정/심리', 0, 9, NOW());
INSERT INTO category (name, depth, order_index, created_at) VALUES ('의료기기', 0, 10, NOW());
INSERT INTO category (name, depth, order_index, created_at) VALUES ('피부/위생/여가', 0, 11, NOW());

-- ============================
-- PHRASE (카테고리별 표현)
-- category_id는 위 INSERT 순서 기준 (1~11)
-- ============================

-- 1. 석션 (가래/침)
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (1, '가래 빼줘', 1, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (1, '침 빼줘', 2, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (1, '더 해줘', 3, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (1, '끈적해/안나와', 4, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (1, '그만/됐어', 5, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (1, '침 흘러', 6, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (1, '기침유발기 해줘', 7, NOW());

-- 2. 호흡
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (2, '호흡기 불편해', 1, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (2, '공기 더 넣어줘', 2, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (2, '가슴이 아파', 3, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (2, '산소포화도 확인해줘', 4, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (2, '숨쉬기 편해졌어', 5, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (2, '공기 줄여줘', 6, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (2, '호흡기 이상해', 7, NOW());

-- 3. 통증
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (3, '뻣뻣해/굳었어', 1, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (3, '저려/감각없어', 2, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (3, '주물러줘', 3, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (3, '뜨거워', 4, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (3, '쥐났어/근육떨려', 5, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (3, '관절운동해줘', 6, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (3, '붓었어', 7, NOW());

-- 4. 자세
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (4, '왼쪽으로 돌려줘', 1, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (4, '오른쪽으로 돌려줘', 2, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (4, '머리(등) 높여/낮춰줘', 3, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (4, '앉히줘', 4, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (4, '기다려/잠깐', 5, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (4, '눕히줘', 6, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (4, '베개 조절해줘', 7, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (4, '다리(팔) 올려줘', 8, NOW());

-- 5. 체온/환경
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (5, '더워', 1, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (5, '추워', 2, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (5, '땀 닦아줘', 3, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (5, '이불 덮어줘/벗겨줘', 4, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (5, '바람 쐬고 싶어', 5, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (5, '환기해줘', 6, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (5, '에어컨/히터', 7, NOW());

-- 6. 구강/식사
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (6, '입 안 적셔줘', 1, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (6, '경관식 멈춰줘', 2, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (6, '토할 것 같아', 3, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (6, '경관식 속도 줄여줘', 4, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (6, '배 불러/그만', 5, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (6, '배 고파', 6, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (6, '입술 발라줘', 7, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (6, '물 적셔줘', 8, NOW());

-- 7. 배변/배뇨
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (7, '소변 마려워', 1, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (7, '기저귀 갈아줘', 2, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (7, '변비야', 3, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (7, '가스 찼어', 4, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (7, '소변줄 불편해', 5, NOW());

-- 8. 수면/피로
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (8, '잠이 안 와', 1, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (8, '머리 아파', 2, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (8, '불 꺼줘/켜줘', 3, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (8, '조용히 해줘', 4, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (8, '졸려', 5, NOW());

-- 9. 감정/심리
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (9, '무서워/불안해', 1, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (9, '답답해', 2, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (9, '괜찮아/좋아', 3, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (9, '고마워', 4, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (9, '가족 보고 싶어', 5, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (9, '외로워/심심해', 6, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (9, '울고 싶어', 7, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (9, '사랑해', 8, NOW());

-- 10. 의료기기
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (10, '호흡기 이상해', 1, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (10, '산소포화도 확인해줘', 2, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (10, '목관(기관) 주변 불편해', 3, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (10, '위루관 주변 아파', 4, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (10, '약 줘', 5, NOW());

-- 11. 피부/위생/여가
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (11, '가려워', 1, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (11, '닦아줘/씻어줘', 2, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (11, '눈 닦아줘', 3, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (11, '피부 쓸려/따가워', 4, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (11, '입술 발라줘', 5, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (11, '코 풀어줘', 6, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (11, 'TV 틀어줘', 7, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (11, '음악 틀어줘', 8, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (11, '시간 몇 시야?', 9, NOW());
INSERT INTO phrase (category_id, content, order_index, created_at) VALUES (11, '밖에 나가고 싶어', 10, NOW());
-- ============================================
-- GENERAL_CORPUS v2
-- 67세 남성 ALS 환자 페르소나: 김영수
-- 차분하고 담백한 말투, 손녀딸/야구(롯데)/트로트 좋아함
-- 왼쪽 어깨 통증 심함, 오른쪽 다리/허리 통증 있음
-- 인터넷 용어, 귀여운 말투(~엉, ~징), 이모티콘, ㅋㅋ 등 제거
-- ============================================

INSERT INTO general_corpus (content, sentiment, weight, created_at) VALUES
  -- ===== 긍정 응답 (50개) =====
  ('응, 좋아.', 'POSITIVE', 1.0, NOW()),
  ('맞아.', 'POSITIVE', 1.0, NOW()),
  ('그래.', 'POSITIVE', 1.0, NOW()),
  ('그렇지.', 'POSITIVE', 1.0, NOW()),
  ('고마워.', 'POSITIVE', 1.0, NOW()),
  ('고맙다.', 'POSITIVE', 1.0, NOW()),
  ('괜찮아.', 'POSITIVE', 1.0, NOW()),
  ('좋았어.', 'POSITIVE', 1.0, NOW()),
  ('다행이다.', 'POSITIVE', 1.0, NOW()),
  ('잘했어.', 'POSITIVE', 1.0, NOW()),
  ('그래 좋아', 'POSITIVE', 1.0, NOW()),
  ('기분 좋아.', 'POSITIVE', 1.0, NOW()),
  ('오늘 좋은 날이야.', 'POSITIVE', 1.0, NOW()),
  ('행복해.', 'POSITIVE', 1.0, NOW()),
  ('편해졌어.', 'POSITIVE', 1.0, NOW()),
  ('나아졌어.', 'POSITIVE', 1.0, NOW()),
  ('맛있었어.', 'POSITIVE', 1.0, NOW()),
  ('그거 좋다.', 'POSITIVE', 1.0, NOW()),
  ('해봐.', 'POSITIVE', 1.0, NOW()),
  ('그래 그래.', 'POSITIVE', 1.0, NOW()),
  ('알겠어.', 'POSITIVE', 1.0, NOW()),
  ('응 맞아.', 'POSITIVE', 1.0, NOW()),
  ('사실 그래.', 'POSITIVE', 1.0, NOW()),
  ('나도 좋아.', 'POSITIVE', 1.0, NOW()),
  ('기대된다.', 'POSITIVE', 1.0, NOW()),
  ('보고 싶었어.', 'POSITIVE', 1.0, NOW()),
  ('응 그래.', 'POSITIVE', 1.0, NOW()),
  ('맞아 맞아.', 'POSITIVE', 1.0, NOW()),
  ('괜찮아진 것 같아.', 'POSITIVE', 1.0, NOW()),
  ('좋아졌어.', 'POSITIVE', 1.0, NOW()),
  ('걱정 마.', 'POSITIVE', 1.0, NOW()),
  ('별거 아니야.', 'POSITIVE', 1.0, NOW()),
  ('그럴 수 있어.', 'POSITIVE', 1.0, NOW()),
  ('이해해.', 'POSITIVE', 1.0, NOW()),
  ('신경 쓰지 마.', 'POSITIVE', 1.0, NOW()),
  ('그래도 돼.', 'POSITIVE', 1.0, NOW()),
  ('고생했어.', 'POSITIVE', 1.0, NOW()),
  ('잘 먹었어', 'POSITIVE', 1.0, NOW()),
  ('편하다', 'POSITIVE', 1.0, NOW()),
  ('좋은 하루야', 'POSITIVE', 1.0, NOW()),
  ('힘내자', 'POSITIVE', 1.0, NOW()),
  ('나 괜찮아', 'POSITIVE', 1.0, NOW()),
  ('잘 지내', 'POSITIVE', 1.0, NOW()),
  ('오늘 컨디션 좋아', 'POSITIVE', 1.0, NOW()),
  ('그래 알았어', 'POSITIVE', 1.0, NOW()),
  ('그거 해줘', 'POSITIVE', 1.0, NOW()),
  ('응 먹었어', 'POSITIVE', 1.0, NOW()),
  ('조금 나아졌어', 'POSITIVE', 1.0, NOW()),
  ('잘 잤어', 'POSITIVE', 1.0, NOW()),
  ('오늘 기분 괜찮아', 'POSITIVE', 1.0, NOW()),

  -- ===== 부정 응답 (40개) =====
  ('아니야', 'NEGATIVE', 1.0, NOW()),
  ('별로야', 'NEGATIVE', 1.0, NOW()),
  ('안 좋아', 'NEGATIVE', 1.0, NOW()),
  ('싫어', 'NEGATIVE', 1.0, NOW()),
  ('안 해', 'NEGATIVE', 1.0, NOW()),
  ('필요 없어', 'NEGATIVE', 1.0, NOW()),
  ('됐어', 'NEGATIVE', 1.0, NOW()),
  ('그냥 둬', 'NEGATIVE', 1.0, NOW()),
  ('아직 아니야', 'NEGATIVE', 1.0, NOW()),
  ('지금은 아니야', 'NEGATIVE', 1.0, NOW()),
  ('안 괜찮아', 'NEGATIVE', 1.0, NOW()),
  ('그건 싫어', 'NEGATIVE', 1.0, NOW()),
  ('하기 싫어', 'NEGATIVE', 1.0, NOW()),
  ('나중에 해', 'NEGATIVE', 1.0, NOW()),
  ('안 해도 돼', 'NEGATIVE', 1.0, NOW()),
  ('모르겠어', 'NEGATIVE', 1.0, NOW()),
  ('별로 안 좋아', 'NEGATIVE', 1.0, NOW()),
  ('미안해', 'NEGATIVE', 1.0, NOW()),
  ('슬퍼', 'NEGATIVE', 1.0, NOW()),
  ('힘들어', 'NEGATIVE', 1.0, NOW()),
  ('우울해', 'NEGATIVE', 1.0, NOW()),
  ('불안해', 'NEGATIVE', 1.0, NOW()),
  ('외로워', 'NEGATIVE', 1.0, NOW()),
  ('답답해', 'NEGATIVE', 1.0, NOW()),
  ('무서워', 'NEGATIVE', 1.0, NOW()),
  ('걱정돼', 'NEGATIVE', 1.0, NOW()),
  ('짜증나', 'NEGATIVE', 1.0, NOW()),
  ('화났어', 'NEGATIVE', 1.0, NOW()),
  ('잠을 못 잤어', 'NEGATIVE', 1.0, NOW()),
  ('컨디션 별로야', 'NEGATIVE', 1.0, NOW()),
  ('입맛 없어', 'NEGATIVE', 1.0, NOW()),
  ('안 먹을게', 'NEGATIVE', 1.0, NOW()),
  ('그만 먹을게', 'NEGATIVE', 1.0, NOW()),
  ('맛없어', 'NEGATIVE', 1.0, NOW()),
  ('피곤해', 'NEGATIVE', 1.0, NOW()),
  ('지쳤어', 'NEGATIVE', 1.0, NOW()),
  ('아직 아파', 'NEGATIVE', 1.0, NOW()),
  ('잠깐 기다려', 'NEGATIVE', 1.0, NOW()),
  ('조금만 쉴게', 'NEGATIVE', 1.0, NOW()),
  ('오늘은 안 할래', 'NEGATIVE', 1.0, NOW()),

  -- ===== 통증/건강 (40개) =====
  ('좀 아파', 'NEUTRAL', 1.0, NOW()),
  ('많이 아파', 'NEUTRAL', 1.0, NOW()),
  ('머리 아파', 'NEUTRAL', 1.0, NOW()),
  ('배 아파', 'NEUTRAL', 1.0, NOW()),
  ('어깨 아파', 'NEUTRAL', 1.0, NOW()),
  ('왼쪽 어깨가 저려', 'NEUTRAL', 1.0, NOW()),
  ('왼쪽 어깨 또 아파', 'NEUTRAL', 1.0, NOW()),
  ('어깨 결려', 'NEUTRAL', 1.0, NOW()),
  ('어깨 좀 주물러줘', 'NEUTRAL', 1.0, NOW()),
  ('오른쪽 다리 아파', 'NEUTRAL', 1.0, NOW()),
  ('다리 저려', 'NEUTRAL', 1.0, NOW()),
  ('다리 좀 올려줘', 'NEUTRAL', 1.0, NOW()),
  ('허리 아파', 'NEUTRAL', 1.0, NOW()),
  ('허리 불편해', 'NEUTRAL', 1.0, NOW()),
  ('허리 받쳐줘', 'NEUTRAL', 1.0, NOW()),
  ('목 아파', 'NEUTRAL', 1.0, NOW()),
  ('등 아파', 'NEUTRAL', 1.0, NOW()),
  ('몸이 뻐근해', 'NEUTRAL', 1.0, NOW()),
  ('숨 쉬기 힘들어', 'NEUTRAL', 1.0, NOW()),
  ('어지러워', 'NEUTRAL', 1.0, NOW()),
  ('약 먹었어', 'NEUTRAL', 1.0, NOW()),
  ('약 줘', 'NEUTRAL', 1.0, NOW()),
  ('진통제 줘', 'NEUTRAL', 1.0, NOW()),
  ('오늘은 좀 나아', 'NEUTRAL', 1.0, NOW()),
  ('어제보다 나아', 'NEUTRAL', 1.0, NOW()),
  ('찜질 해줘', 'NEUTRAL', 1.0, NOW()),
  ('마사지 해줘', 'NEUTRAL', 1.0, NOW()),
  ('자세 바꿔줘', 'NEUTRAL', 1.0, NOW()),
  ('베개 높여줘', 'NEUTRAL', 1.0, NOW()),
  ('베개 낮춰줘', 'NEUTRAL', 1.0, NOW()),
  ('이불 덮어줘', 'NEUTRAL', 1.0, NOW()),
  ('이불 벗겨줘', 'NEUTRAL', 1.0, NOW()),
  ('더워', 'NEUTRAL', 1.0, NOW()),
  ('추워', 'NEUTRAL', 1.0, NOW()),
  ('창문 열어줘', 'NEUTRAL', 1.0, NOW()),
  ('창문 닫아줘', 'NEUTRAL', 1.0, NOW()),
  ('에어컨 켜줘', 'NEUTRAL', 1.0, NOW()),
  ('에어컨 꺼줘', 'NEUTRAL', 1.0, NOW()),
  ('물리치료 받을래', 'NEUTRAL', 1.0, NOW()),
  ('물리치료 힘들었어', 'NEUTRAL', 1.0, NOW()),

  -- ===== 요청/일상 (40개) =====
  ('물 좀 줘', 'NEUTRAL', 1.0, NOW()),
  ('물 마시고 싶어', 'NEUTRAL', 1.0, NOW()),
  ('목 말라', 'NEUTRAL', 1.0, NOW()),
  ('배고파', 'NEUTRAL', 1.0, NOW()),
  ('밥 먹고 싶어', 'NEUTRAL', 1.0, NOW()),
  ('국 먹고 싶어', 'NEUTRAL', 1.0, NOW()),
  ('죽 먹고 싶어', 'NEUTRAL', 1.0, NOW()),
  ('과일 먹고 싶어', 'NEUTRAL', 1.0, NOW()),
  ('도와줘', 'NEUTRAL', 1.0, NOW()),
  ('불 켜줘', 'NEUTRAL', 1.0, NOW()),
  ('불 꺼줘', 'NEUTRAL', 1.0, NOW()),
  ('TV 켜줘', 'NEUTRAL', 1.0, NOW()),
  ('TV 꺼줘', 'NEUTRAL', 1.0, NOW()),
  ('음악 틀어줘', 'NEUTRAL', 1.0, NOW()),
  ('트로트 틀어줘', 'NEUTRAL', 1.0, NOW()),
  ('라디오 틀어줘', 'NEUTRAL', 1.0, NOW()),
  ('소리 좀 줄여줘', 'NEUTRAL', 1.0, NOW()),
  ('소리 좀 키워줘', 'NEUTRAL', 1.0, NOW()),
  ('전화해줘', 'NEUTRAL', 1.0, NOW()),
  ('손 잡아줘', 'NEUTRAL', 1.0, NOW()),
  ('가까이 와줘', 'NEUTRAL', 1.0, NOW()),
  ('침대 올려줘', 'NEUTRAL', 1.0, NOW()),
  ('침대 내려줘', 'NEUTRAL', 1.0, NOW()),
  ('조금 더 줘', 'NEUTRAL', 1.0, NOW()),
  ('천천히 해줘', 'NEUTRAL', 1.0, NOW()),
  ('다시 해줘', 'NEUTRAL', 1.0, NOW()),
  ('살살 해줘', 'NEUTRAL', 1.0, NOW()),
  ('잠깐만', 'NEUTRAL', 1.0, NOW()),
  ('좀 있다가', 'NEUTRAL', 1.0, NOW()),
  ('지금 해줘', 'NEUTRAL', 1.0, NOW()),
  ('기다려줘', 'NEUTRAL', 1.0, NOW()),
  ('시간 몇 시야', 'NEUTRAL', 1.0, NOW()),
  ('오늘 무슨 요일이야', 'NEUTRAL', 1.0, NOW()),
  ('밖에 날씨 어때', 'NEUTRAL', 1.0, NOW()),
  ('비 와', 'NEUTRAL', 1.0, NOW()),
  ('날씨 좋아', 'NEUTRAL', 1.0, NOW()),
  ('좀 쉬어야겠어', 'NEUTRAL', 1.0, NOW()),
  ('그냥 좀 누워있을게', 'NEUTRAL', 1.0, NOW()),
  ('졸려', 'NEUTRAL', 1.0, NOW()),
  ('잠이 안 와', 'NEUTRAL', 1.0, NOW()),

  -- ===== 가족/손녀딸 (30개) =====
  ('손녀딸 보고 싶어', 'POSITIVE', 1.2, NOW()),
  ('손녀딸 언제 와', 'NEUTRAL', 1.2, NOW()),
  ('손녀딸 오늘 와', 'NEUTRAL', 1.2, NOW()),
  ('손녀딸 만나고 싶어', 'POSITIVE', 1.2, NOW()),
  ('손녀딸 기다려', 'POSITIVE', 1.2, NOW()),
  ('손녀딸 잘 있어', 'NEUTRAL', 1.2, NOW()),
  ('손녀딸 학교 갔어', 'NEUTRAL', 1.2, NOW()),
  ('손녀딸 생각나', 'POSITIVE', 1.2, NOW()),
  ('손녀딸한테 전화해줘', 'NEUTRAL', 1.2, NOW()),
  ('손녀딸 사진 보여줘', 'NEUTRAL', 1.2, NOW()),
  ('가족 보고 싶어', 'POSITIVE', 1.0, NOW()),
  ('딸 언제 와', 'NEUTRAL', 1.0, NOW()),
  ('아들 잘 있어', 'NEUTRAL', 1.0, NOW()),
  ('집사람 어디 갔어', 'NEUTRAL', 1.0, NOW()),
  ('손자 학교 잘 다녀', 'NEUTRAL', 1.0, NOW()),
  ('가족들 다 잘 지내', 'NEUTRAL', 1.0, NOW()),
  ('보고 싶다', 'POSITIVE', 1.0, NOW()),
  ('사랑해', 'POSITIVE', 1.0, NOW()),
  ('고맙다 진짜', 'POSITIVE', 1.0, NOW()),
  ('옆에 있어줘', 'NEUTRAL', 1.0, NOW()),
  ('혼자 있기 싫어', 'NEGATIVE', 1.0, NOW()),
  ('같이 있어줘', 'NEUTRAL', 1.0, NOW()),
  ('외출하고 싶어', 'NEUTRAL', 1.0, NOW()),
  ('산책하고 싶어', 'NEUTRAL', 1.0, NOW()),
  ('바깥 공기 쐬고 싶어', 'NEUTRAL', 1.0, NOW()),
  ('누가 왔어', 'NEUTRAL', 1.0, NOW()),
  ('오늘 방문 있어', 'NEUTRAL', 1.0, NOW()),
  ('간호사 언제 와', 'NEUTRAL', 1.0, NOW()),
  ('선생님 언제 와', 'NEUTRAL', 1.0, NOW()),
  ('면회 가능해', 'NEUTRAL', 1.0, NOW()),

  -- ===== 야구/롯데 (20개) =====
  ('롯데 오늘 경기해', 'NEUTRAL', 1.2, NOW()),
  ('롯데 이겼어', 'POSITIVE', 1.2, NOW()),
  ('롯데 졌어', 'NEGATIVE', 1.2, NOW()),
  ('야구 보고 싶어', 'POSITIVE', 1.2, NOW()),
  ('야구 중계 틀어줘', 'NEUTRAL', 1.2, NOW()),
  ('롯데 몇 대 몇이야', 'NEUTRAL', 1.2, NOW()),
  ('오늘 선발 누구야', 'NEUTRAL', 1.2, NOW()),
  ('롯데 잘하고 있어', 'POSITIVE', 1.2, NOW()),
  ('야구 결과 알려줘', 'NEUTRAL', 1.2, NOW()),
  ('사직구장 가고 싶다', 'POSITIVE', 1.2, NOW()),
  ('야구 시즌이야', 'NEUTRAL', 1.0, NOW()),
  ('오늘 야구 있어', 'NEUTRAL', 1.0, NOW()),
  ('야구 점수 어떻게 돼', 'NEUTRAL', 1.0, NOW()),
  ('롯데 화이팅', 'POSITIVE', 1.2, NOW()),
  ('예전에 사직구장 자주 갔어', 'NEUTRAL', 1.0, NOW()),
  ('야구 보면 기분 좋아', 'POSITIVE', 1.0, NOW()),
  ('홈런 쳤어', 'POSITIVE', 1.0, NOW()),
  ('오늘 경기 몇 시야', 'NEUTRAL', 1.0, NOW()),
  ('내일 경기 있어', 'NEUTRAL', 1.0, NOW()),
  ('롯데 순위 어때', 'NEUTRAL', 1.0, NOW()),

  -- ===== 트로트/음악 (15개) =====
  ('트로트 듣고 싶어', 'POSITIVE', 1.2, NOW()),
  ('트로트 틀어줘', 'NEUTRAL', 1.2, NOW()),
  ('이 노래 좋다', 'POSITIVE', 1.0, NOW()),
  ('노래 한 번 더 틀어줘', 'NEUTRAL', 1.0, NOW()),
  ('이미자 노래 틀어줘', 'NEUTRAL', 1.0, NOW()),
  ('나훈아 노래 듣고 싶어', 'POSITIVE', 1.0, NOW()),
  ('음악 듣고 있으면 편해', 'POSITIVE', 1.0, NOW()),
  ('조용한 노래 틀어줘', 'NEUTRAL', 1.0, NOW()),
  ('노래 소리 좀 줄여줘', 'NEUTRAL', 1.0, NOW()),
  ('라디오에서 좋은 노래 나와', 'POSITIVE', 1.0, NOW()),
  ('옛날 노래 듣고 싶어', 'NEUTRAL', 1.0, NOW()),
  ('음악 끄지 마', 'NEUTRAL', 1.0, NOW()),
  ('이 노래 제목이 뭐야', 'NEUTRAL', 1.0, NOW()),
  ('노래 들으니까 좋다', 'POSITIVE', 1.0, NOW()),
  ('트로트 들으면 기분 좋아', 'POSITIVE', 1.2, NOW()),

  -- ===== 식사/음식 (25개) =====
  ('밥 먹었어', 'NEUTRAL', 1.0, NOW()),
  ('아직 안 먹었어', 'NEUTRAL', 1.0, NOW()),
  ('맛있었어', 'POSITIVE', 1.0, NOW()),
  ('맛없었어', 'NEGATIVE', 1.0, NOW()),
  ('더 먹을게', 'NEUTRAL', 1.0, NOW()),
  ('배 불러', 'NEUTRAL', 1.0, NOW()),
  ('간식 먹고 싶어', 'NEUTRAL', 1.0, NOW()),
  ('따뜻한 거 먹고 싶어', 'NEUTRAL', 1.0, NOW()),
  ('시원한 거 먹고 싶어', 'NEUTRAL', 1.0, NOW()),
  ('김치찌개 먹고 싶어', 'POSITIVE', 1.0, NOW()),
  ('된장찌개 먹고 싶어', 'POSITIVE', 1.0, NOW()),
  ('국밥 먹고 싶어', 'POSITIVE', 1.0, NOW()),
  ('미역국 먹고 싶어', 'POSITIVE', 1.0, NOW()),
  ('수박 먹고 싶어', 'NEUTRAL', 1.0, NOW()),
  ('우유 줘', 'NEUTRAL', 1.0, NOW()),
  ('커피 마시고 싶어', 'NEUTRAL', 1.0, NOW()),
  ('차 한 잔 줘', 'NEUTRAL', 1.0, NOW()),
  ('물 한 모금만', 'NEUTRAL', 1.0, NOW()),
  ('좀 싱거워', 'NEUTRAL', 1.0, NOW()),
  ('좀 짜', 'NEUTRAL', 1.0, NOW()),
  ('뜨거워', 'NEUTRAL', 1.0, NOW()),
  ('차가워', 'NEUTRAL', 1.0, NOW()),
  ('조금만 줘', 'NEUTRAL', 1.0, NOW()),
  ('경관식 시간이야', 'NEUTRAL', 1.0, NOW()),
  ('물 좀 적셔줘', 'NEUTRAL', 1.0, NOW()),

  -- ===== 일상 대화 (30개) =====
  ('오늘 뭐 해', 'NEUTRAL', 1.0, NOW()),
  ('심심해', 'NEUTRAL', 1.0, NOW()),
  ('뭐 하고 있어', 'NEUTRAL', 1.0, NOW()),
  ('오늘 일정 알려줘', 'NEUTRAL', 1.0, NOW()),
  ('오늘 치료 있어', 'NEUTRAL', 1.0, NOW()),
  ('약 먹을 시간이야', 'NEUTRAL', 1.0, NOW()),
  ('밥 먹을 시간이야', 'NEUTRAL', 1.0, NOW()),
  ('아침 식사 할래', 'NEUTRAL', 1.0, NOW()),
  ('저녁 뭐 먹어', 'NEUTRAL', 1.0, NOW()),
  ('내일 뭐 해', 'NEUTRAL', 1.0, NOW()),
  ('그냥 그래', 'NEUTRAL', 1.0, NOW()),
  ('그저그래', 'NEUTRAL', 1.0, NOW()),
  ('뭐 별로 없어', 'NEUTRAL', 1.0, NOW()),
  ('그냥 있었어', 'NEUTRAL', 1.0, NOW()),
  ('특별한 거 없어', 'NEUTRAL', 1.0, NOW()),
  ('그냥 쉬고 있었어', 'NEUTRAL', 1.0, NOW()),
  ('TV 보고 있었어', 'NEUTRAL', 1.0, NOW()),
  ('낮잠 잤어', 'NEUTRAL', 1.0, NOW()),
  ('책 읽어줘', 'NEUTRAL', 1.0, NOW()),
  ('뉴스 보여줘', 'NEUTRAL', 1.0, NOW()),
  ('뭐 재밌는 거 없어', 'NEUTRAL', 1.0, NOW()),
  ('산책 가고 싶어', 'NEUTRAL', 1.0, NOW()),
  ('햇빛 쬐고 싶어', 'NEUTRAL', 1.0, NOW()),
  ('밖에 나가고 싶어', 'NEUTRAL', 1.0, NOW()),
  ('집에 가고 싶어', 'NEUTRAL', 1.0, NOW()),
  ('언제 퇴원해', 'NEUTRAL', 1.0, NOW()),
  ('오래 걸려', 'NEUTRAL', 1.0, NOW()),
  ('빨리 낫고 싶어', 'NEUTRAL', 1.0, NOW()),
  ('나도 걷고 싶어', 'NEUTRAL', 1.0, NOW()),
  ('예전에는 좋았는데', 'NEUTRAL', 1.0, NOW());

-- 2. 테스트용 USER / PATIENT / GUARDIAN / MATCHING
-- 비밀번호: asdf1234 (BCrypt 해시)
INSERT IGNORE INTO users (id, login_id, password, name, role, is_agree, created_at, updated_at)
VALUES (1, 'p@p.com', '$2a$12$ti5ImhRhBOMDaI3IrmfC2ePN.IRSBJGAI9bvc2rqNOvrVr2U5hupi', '김영수', 'PATIENT', true, NOW(), NOW());
INSERT IGNORE INTO users (id, login_id, password, name, role, is_agree, created_at, updated_at)
VALUES (2, 'g@g.com', '$2a$12$ti5ImhRhBOMDaI3IrmfC2ePN.IRSBJGAI9bvc2rqNOvrVr2U5hupi', '김미영', 'GUARDIAN', true, NOW(), NOW());

INSERT IGNORE INTO patient (id, user_id, name, birth_year, gender, created_at, updated_at)
VALUES (1, 1, '김영수', 1960, 'M', NOW(), NOW());
INSERT IGNORE INTO guardian (id, user_id, created_at, updated_at)
VALUES (1, 2, NOW(), NOW());

INSERT IGNORE INTO matching (id, patient_id, guardian_id, invite_code, status, linked_at, created_at, updated_at)
VALUES (1, 1, 1, 'TEST001', 'LINKED', NOW(), NOW(), NOW());

-- 2-1. PATIENT_SETTING (matching_id=1)
INSERT IGNORE INTO patient_setting (id, matching_id, activation_delay, dwell_time, created_at, updated_at)
VALUES (1, 1, 500, 1000, NOW(), NOW());

-- 2-2. TTS_SETTING (matching_id=1)
INSERT IGNORE INTO tts_setting (id, matching_id, is_enabled, status, created_at, updated_at)
VALUES (1, 1, false, 'NONE', NOW(), NOW());

-- 2-3. LEISURE_CONTENT (matching_id=1)
INSERT IGNORE INTO leisure_content (id, matching_id, name, url, category, created_at, updated_at)
VALUES (1, 1, '좋아하는 음악', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', NULL, NOW(), NOW()),
       (2, 1, '뉴스 보기', NULL, 'news', NOW(), NOW()),
       (3, 1, '스포츠 하이라이트', NULL, 'sports', NOW(), NOW());

-- 2-4. ROUTINE_SLOT_TAG (matching_id=1, 7개 타임슬롯 각 1개 태그)
INSERT IGNORE INTO routine_slot_tag (id, matching_id, time_slot_id, activity_tag_id, created_at)
VALUES (1, 1, 1, 1, NOW()),   -- 기상/아침: 경관식/수분섭취
       (2, 1, 2, 7, NOW()),   -- 오전: 재활/ROM운동
       (3, 1, 3, 1, NOW()),   -- 점심/낮: 경관식/수분섭취
       (4, 1, 4, 9, NOW()),   -- 오후: 영상시청
       (5, 1, 5, 6, NOW()),   -- 저녁: 배변/배뇨케어
       (6, 1, 6, 8, NOW()),   -- 취침준비: 세면/위생
       (7, 1, 7, 11, NOW());  -- 야간: 휴식/수면

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
