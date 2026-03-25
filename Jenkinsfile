// =============================================================================
// Jenkinsfile - CI/CD Pipeline
// =============================================================================
// develop 브랜치 → Dev 환경 배포
// release 브랜치 → Prod 환경 배포 (Blue/Green)
//
// 필요 Jenkins Credentials:
//   - env-backend-dev (Secret File): backend/.env.dev
//   - env-backend-prod (Secret File): backend/.env.prod
//   - mattermost-webhook (Secret Text): Mattermost Webhook URL
// =============================================================================

// Blue/Green 배포 대상 (Prod에서만 사용)
def deployTarget = ""

pipeline {
    agent any

    environment {
        // 프로젝트 이름 (알림에 표시)
        PROJECT_NAME = "eyespeak"

        // 배포 URL (Smoke Test에서 사용)
        DEV_URL = 'https://j14e205.p.ssafy.io/dev'
        PROD_URL = 'https://j14e205.p.ssafy.io'
    }

    options {
        timeout(time: 30, unit: 'MINUTES')    // 빌드 최대 30분
        buildDiscarder(logRotator(numToKeepStr: '10'))  // 최근 10개 빌드만 보관
        disableConcurrentBuilds()              // 동시 빌드 방지
        timestamps()                           // 로그에 시간 표시
    }

    stages {
        // =================================================================
        // 1단계: 코드 가져오기
        // =================================================================
        stage('Checkout') {
            steps {
                script {
                    def branchName = env.BRANCH_NAME ?: 'unknown'
                    if (branchName == 'develop' || branchName == 'release') {
                        sendNotification(
                            "🚀 **${PROJECT_NAME}** 빌드 시작\n- 브랜치: ${branchName}\n- 빌드: #${env.BUILD_NUMBER}",
                            '#439FE0'
                        )
                    }
                }
                checkout scm
            }
        }

        // =================================================================
        // 2단계: 빌드 준비
        // =================================================================
        stage('Prepare') {
            steps {
                script {
                    // gradlew 실행 권한 부여 (Linux 서버에서 필요)
                    sh "chmod +x backend/gradlew || true"
                    sh "chmod +x scripts/*.sh || true"
                }
            }
        }

        // =================================================================
        // 빌드 테스트 (feature 브랜치 - MR 시 실행)
        // =================================================================
        stage('Build Test') {
            when {
                not { branch 'develop' }
                not { branch 'release' }
            }
            steps {
                script {
                    def commitSha = sh(script: 'git rev-parse HEAD', returnStdout: true).trim()
                    def projectId = '1273805'

                    // 빌드 시작 상태 전송
                    withCredentials([usernamePassword(credentialsId: 'e205-gitlab', usernameVariable: 'GL_USER', passwordVariable: 'GL_TOKEN')]) {
                        sh """
                            curl -s --request POST \
                            --header "PRIVATE-TOKEN: \$GL_TOKEN" \
                            "https://lab.ssafy.com/api/v4/projects/${projectId}/statuses/${commitSha}?state=running&name=build-test&target_url=${env.BUILD_URL}"
                        """
                    }
                }

                dir('backend') {
                    sh 'chmod +x gradlew'
                    sh './gradlew clean compileJava --no-daemon'
                }
            }
            post {
                success {
                    script {
                        def commitSha = sh(script: 'git rev-parse HEAD', returnStdout: true).trim()
                        def projectId = '1273805'
                        withCredentials([usernamePassword(credentialsId: 'e205-gitlab', usernameVariable: 'GL_USER', passwordVariable: 'GL_TOKEN')]) {
                            sh """
                                curl -s --request POST \
                                --header "PRIVATE-TOKEN: \$GL_TOKEN" \
                                "https://lab.ssafy.com/api/v4/projects/${projectId}/statuses/${commitSha}?state=success&name=build-test&target_url=${env.BUILD_URL}"
                            """
                        }
                    }
                }
                failure {
                    script {
                        def commitSha = sh(script: 'git rev-parse HEAD', returnStdout: true).trim()
                        def projectId = '1273805'
                        withCredentials([usernamePassword(credentialsId: 'e205-gitlab', usernameVariable: 'GL_USER', passwordVariable: 'GL_TOKEN')]) {
                            sh """
                                curl -s --request POST \
                                --header "PRIVATE-TOKEN: \$GL_TOKEN" \
                                "https://lab.ssafy.com/api/v4/projects/${projectId}/statuses/${commitSha}?state=failed&name=build-test&target_url=${env.BUILD_URL}"
                            """
                        }
                    }
                }
            }
        }

        // =================================================================
        // Dev 파이프라인 (develop 브랜치)
        // =================================================================
        stage('Dev Pipeline') {
            when { branch 'develop' }
            stages {
                // ── Dev 배포 ─────────────────────────────────
                stage('Deploy (Dev)') {
                    steps {
                        script {
                            sendNotification("🚀 **[Dev]** 배포 중...", '#FFA500')

                            // Jenkins에 저장된 .env 파일을 backend 폴더로 복사
                            withCredentials([file(credentialsId: 'env-backend-dev', variable: 'ENV_FILE')]) {
                                sh 'cp $ENV_FILE backend/.env.dev'
                            }

                            // FCM 서비스 계정 키 복사 (Secret Text → 파일로 저장)
                            withCredentials([string(credentialsId: 'fcm-secret-key', variable: 'FCM_KEY')]) {
                                sh 'printf "%s" "$FCM_KEY" > backend/src/main/resources/google-service.json'
                            }

                            // Makefile의 dev-app-up 실행
                            sh "make dev-app-up"
                        }
                    }
                    post {
                        failure {
                            script {
                                sendNotification(
                                    "❌ **[Dev]** 배포 실패!\n- 로그: ${env.BUILD_URL}console",
                                    '#FF0000'
                                )
                            }
                        }
                    }
                }

                // ── AI 서버 배포 (변경 시에만) ─────────────────
                stage('Deploy AI (Dev)') {
                    steps {
                        script {
                            def aiChanged = sh(
                                script: "git diff HEAD~1 --name-only -- ai-tts/ ai-recommend/ ai-eyetracking/ infra/docker-compose.ai.yml | head -1",
                                returnStdout: true
                            ).trim()

                            if (aiChanged) {
                                echo "AI 서버 변경 감지: ${aiChanged}"
                                sendNotification("🤖 **[Dev]** AI 서버 변경 감지, 재빌드 중...", '#439FE0')
                                sh "make ai-down && make ai-up"
                            } else {
                                echo "AI 서버 변경 없음, 스킵"
                            }
                        }
                    }
                    post {
                        failure {
                            script {
                                sendNotification("❌ **[Dev]** AI 서버 배포 실패!", '#FF0000')
                            }
                        }
                    }
                }

                // ── Dev 헬스체크 ─────────────────────────────
                stage('Health Check (Dev)') {
                    steps {
                        script {
                            // 백엔드가 뜰 때까지 최대 90초 대기 (3초 x 30회)
                            def maxRetries = 30
                            def healthy = false

                            for (int i = 1; i <= maxRetries; i++) {
                                def result = sh(
                                    script: 'docker exec eyespeak-was-dev curl -sf http://localhost:8080/api/v1/actuator/health || echo "failed"',
                                    returnStdout: true
                                ).trim()

                                if (result != 'failed' && result.contains('UP')) {
                                    healthy = true
                                    echo "✅ Health Check 통과! (${i}/${maxRetries})"
                                    break
                                }

                                echo "⏳ 대기 중... (${i}/${maxRetries})"
                                sleep(time: 3, unit: 'SECONDS')
                            }

                            if (!healthy) {
                                sh "docker logs --tail 100 eyespeak-was-dev"
                                sendNotification(
                                    "❌ **[Dev]** Health Check 실패!\n- 서버가 응답하지 않습니다.",
                                    '#FF0000'
                                )
                                error "Health Check 실패 (${maxRetries}회 시도)"
                            }
                        }
                    }
                }

                // ── Dev Smoke Test ───────────────────────────
                stage('Smoke Test (Dev)') {
                    steps {
                        script {
                            // 프론트엔드 컨테이너가 완전히 뜰 때까지 대기 후 외부 접근 확인
                            def maxRetries = 10
                            def smokeStatus = ''

                            for (int i = 1; i <= maxRetries; i++) {
                                smokeStatus = sh(
                                    script: "curl -sk -o /dev/null -w '%{http_code}' ${DEV_URL}/ || echo 'failed'",
                                    returnStdout: true
                                ).trim()

                                if (smokeStatus != 'failed' && smokeStatus != '502' && smokeStatus != '503') {
                                    echo "✅ Smoke Test 통과! (응답 코드: ${smokeStatus}, ${i}/${maxRetries})"
                                    break
                                }

                                echo "⏳ 외부 접근 대기 중... (${i}/${maxRetries}, 상태: ${smokeStatus})"
                                sleep(time: 3, unit: 'SECONDS')
                            }

                            if (smokeStatus == 'failed' || smokeStatus == '502' || smokeStatus == '503') {
                                echo "⚠️ 경고: 외부 접근 실패 (상태: ${smokeStatus})"
                                sendNotification(
                                    "⚠️ **[Dev]** Smoke Test 경고: 외부 접근 실패 (${smokeStatus})",
                                    '#FFA500'
                                )
                            }
                        }
                    }
                }
            }
        }

        // =================================================================
        // Prod 파이프라인 (release 브랜치)
        // =================================================================
        stage('Prod Pipeline') {
            when { branch 'release' }
            stages {
                // ── 배포 대상 결정 (Blue/Green) ──────────────
                stage('Determine Target') {
                    steps {
                        script {
                            // 현재 어떤 서버가 살아있는지 확인
                            def blueRunning = sh(
                                script: 'docker ps --filter "name=eyespeak-was-blue" --filter "status=running" -q | grep -q . && echo "true" || echo "false"',
                                returnStdout: true
                            ).trim()

                            def greenRunning = sh(
                                script: 'docker ps --filter "name=eyespeak-was-green" --filter "status=running" -q | grep -q . && echo "true" || echo "false"',
                                returnStdout: true
                            ).trim()

                            echo "상태 - Blue: ${blueRunning}, Green: ${greenRunning}"

                            // 살아있는 서버의 반대쪽에 배포
                            if (blueRunning == 'true' && greenRunning == 'false') {
                                deployTarget = 'green'
                            } else if (greenRunning == 'true' && blueRunning == 'false') {
                                deployTarget = 'blue'
                            } else if (blueRunning == 'true' && greenRunning == 'true') {
                                // 둘 다 살아있으면 Nginx에서 현재 활성 서버 확인
                                def isBlueActive = sh(
                                    script: "docker exec eyespeak-nginx cat /etc/nginx/nginx.conf | grep -q '# server eyespeak-was-blue:8080' && echo 'no' || echo 'yes'",
                                    returnStdout: true
                                ).trim()
                                deployTarget = (isBlueActive == 'yes') ? 'green' : 'blue'
                            } else {
                                // 둘 다 꺼져있으면 blue부터
                                deployTarget = 'blue'
                            }

                            echo "배포 대상: ${deployTarget}"
                            sendNotification(
                                "🎯 **[Prod]** 배포 대상: **${deployTarget.toUpperCase()}**",
                                '#439FE0'
                            )
                        }
                    }
                }

                // ── Prod 배포 ────────────────────────────────
                stage('Deploy (Prod)') {
                    steps {
                        script {
                            sendNotification("🚀 **[Prod]** ${deployTarget.toUpperCase()} 배포 중...", '#FFA500')

                            // Jenkins에 저장된 .env 파일을 backend 폴더로 복사
                            withCredentials([file(credentialsId: 'env-backend-prod', variable: 'ENV_FILE')]) {
                                sh 'cp $ENV_FILE backend/.env.prod'
                            }

                            // FCM 서비스 계정 키 복사 (Secret Text → 파일로 저장)
                            withCredentials([string(credentialsId: 'fcm-secret-key', variable: 'FCM_KEY')]) {
                                sh 'printf "%s" "$FCM_KEY" > backend/src/main/resources/google-service.json'
                            }

                            // Makefile의 prod-app-up 실행
                            sh "make prod-app-up"
                        }
                    }
                    post {
                        failure {
                            script {
                                sendNotification(
                                    "❌ **[Prod]** 배포 실패!\n- 대상: ${deployTarget}\n- 로그: ${env.BUILD_URL}console",
                                    '#FF0000'
                                )
                            }
                        }
                    }
                }

                // ── AI 서버 배포 (변경 시에만) ─────────────────
                stage('Deploy AI (Prod)') {
                    steps {
                        script {
                            def aiChanged = sh(
                                script: "git diff HEAD~1 --name-only -- ai-tts/ ai-recommend/ ai-eyetracking/ infra/docker-compose.ai.yml | head -1",
                                returnStdout: true
                            ).trim()

                            if (aiChanged) {
                                echo "AI 서버 변경 감지: ${aiChanged}"
                                sendNotification("🤖 **[Prod]** AI 서버 변경 감지, 재빌드 중...", '#439FE0')
                                sh "make ai-down && make ai-up"
                            } else {
                                echo "AI 서버 변경 없음, 스킵"
                            }
                        }
                    }
                    post {
                        failure {
                            script {
                                sendNotification("❌ **[Prod]** AI 서버 배포 실패!", '#FF0000')
                            }
                        }
                    }
                }

                // ── Prod 헬스체크 ────────────────────────────
                stage('Health Check (Prod)') {
                    steps {
                        script {
                            def containerName = "eyespeak-was-${deployTarget}"
                            echo "${containerName} 헬스체크 진행 중..."
                            def maxRetries = 30
                            def healthy = false

                            for (int i = 1; i <= maxRetries; i++) {
                                def result = sh(
                                    script: "docker exec ${containerName} curl -sf http://localhost:8080/api/v1/actuator/health || echo 'failed'",
                                    returnStdout: true
                                ).trim()

                                if (result != 'failed' && result.contains('UP')) {
                                    healthy = true
                                    echo "✅ Health Check 통과! (${i}/${maxRetries})"
                                    break
                                }

                                echo "⏳ 대기 중... (${i}/${maxRetries})"
                                sleep(time: 3, unit: 'SECONDS')
                            }

                            if (!healthy) {
                                sh "docker logs --tail 100 ${containerName}"
                                sendNotification(
                                    "❌ **[Prod]** Health Check 실패!\n- 대상: ${deployTarget}",
                                    '#FF0000'
                                )
                                error "Health Check 실패 (${maxRetries}회 시도)"
                            }
                        }
                    }
                }

                // ── 트래픽 전환 ──────────────────────────────
                stage('Switch Traffic') {
                    steps {
                        script {
                            // Nginx가 재시작 루프일 수 있으므로 먼저 restart 후 안정화 대기
                            echo "Nginx 재시작 중..."
                            sh "docker restart eyespeak-nginx || true"
                            sleep(time: 5, unit: 'SECONDS')

                            echo "트래픽 전환: ${deployTarget}..."
                            sh "./scripts/switch-upstream.sh ${deployTarget}"
                            sendNotification(
                                "🔄 **[Prod]** 트래픽 전환 완료: **${deployTarget.toUpperCase()}**",
                                '#36a64f'
                            )
                        }
                    }
                }

                // ── Prod Smoke Test ──────────────────────────
                stage('Smoke Test (Prod)') {
                    steps {
                        script {
                            // Nginx를 통해 외부에서 접근 가능한지 확인 (실제 사용자 접속 경로와 동일)
                            def smokeStatus = sh(
                                script: "curl -sk -o /dev/null -w '%{http_code}' ${PROD_URL}/ || echo 'failed'",
                                returnStdout: true
                            ).trim()

                            if (smokeStatus == 'failed' || smokeStatus == '502' || smokeStatus == '503') {
                                sendNotification(
                                    "❌ **[Prod]** Smoke Test 실패! 외부 접근 실패 (${smokeStatus})\n- 롤백을 고려하세요.",
                                    '#FF0000'
                                )
                                error "Prod Smoke Test 실패 - 외부 접근 실패 (${smokeStatus})"
                            }

                            echo "✅ Prod Smoke Test 통과! (응답 코드: ${smokeStatus})"
                            sendNotification("✅ **[Prod]** Smoke Test 통과!", '#36a64f')
                        }
                    }
                }
            }
        }

        // =================================================================
        // 정리 (미사용 Docker 이미지 삭제)
        // =================================================================
        stage('Cleanup') {
            steps {
                sh 'docker image prune -f || true'
            }
        }
    }

    // =====================================================================
    // 최종 결과 알림 + 실패 시 자동 롤백
    // =====================================================================
    post {
        success {
            script {
                def branchName = env.BRANCH_NAME ?: 'unknown'
                if (branchName == 'develop' || branchName == 'release') {
                    def environment = branchName == 'release' ? 'Production' : 'Development'
                    def targetUrl = branchName == 'release' ? PROD_URL : DEV_URL
                    sendNotification(
                        "✅ **${PROJECT_NAME}** 배포 성공!\n- 환경: ${environment}\n- 빌드: #${env.BUILD_NUMBER}\n- URL: ${targetUrl}",
                        '#36a64f'
                    )
                }
            }
        }

        failure {
            script {
                def branchName = env.BRANCH_NAME ?: 'unknown'
                if (branchName == 'release' && deployTarget) {
                    // Prod 실패 시 자동 롤백: 반대쪽 서버로 트래픽 되돌림
                    def rollbackTarget = deployTarget == 'blue' ? 'green' : 'blue'
                    echo "자동 롤백: ${rollbackTarget}로 전환 중..."

                    try {
                        sh "docker restart eyespeak-nginx || true"
                        sleep 5
                        sh "./scripts/switch-upstream.sh ${rollbackTarget}"
                        sendNotification(
                            "🔄 **자동 롤백 완료!** 트래픽이 **${rollbackTarget.toUpperCase()}**로 전환되었습니다.",
                            '#FFA500'
                        )
                    } catch (Exception e) {
                        sendNotification(
                            "⚠️ **자동 롤백 실패!** 수동 롤백 필요: make switch-${rollbackTarget}",
                            '#FF0000'
                        )
                    }
                }

                if (branchName == 'develop' || branchName == 'release') {
                    def environment = branchName == 'release' ? 'Production' : 'Development'
                    sendNotification(
                        "❌ **${PROJECT_NAME}** 배포 실패!\n- 환경: ${environment}\n- 빌드: #${env.BUILD_NUMBER}\n- 로그: ${env.BUILD_URL}console",
                        '#FF0000'
                    )
                }
            }
        }

        cleanup {
            cleanWs()   // 워크스페이스 정리
        }
    }
}

// =============================================================================
// Mattermost 알림 함수
// =============================================================================
def sendNotification(String message, String color = '#36a64f') {
    withCredentials([string(credentialsId: 'mattermost-webhook', variable: 'WEBHOOK_URL')]) {
        def payload = """{"attachments": [{"color": "${color}", "text": "${message}"}]}"""
        sh """
            curl -s -X POST -H 'Content-Type: application/json' \
            -d '${payload}' \
            "\$WEBHOOK_URL" || true
        """
    }
}
