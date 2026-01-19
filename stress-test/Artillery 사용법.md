#1. 설치
npm install -g artillery

#2. 실행
artillery run sample.yml

#3. 리포트 파일 생성
artillery run -o report.json load-test.yaml

#4. html 리포트로 변환
artillery report report.json

---
# CLI로 cloudwatch대시보드 한번에 생성하기
aws cloudwatch put-dashboard --dashboard-name "Lambda-LoadTest-View" --dashboard-body file://dashboard.json