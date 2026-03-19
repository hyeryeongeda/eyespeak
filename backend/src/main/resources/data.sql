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
