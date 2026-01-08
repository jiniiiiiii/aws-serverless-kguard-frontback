# CloudFront 자동 캐시 무효화(Invalidation) 가이드

AWS CodePipeline으로 배포가 완료된 후, **CloudFront 캐시를 자동으로 삭제(Invalidation)**하여 사용자가 즉시 최신 웹사이트를 볼 수 있도록 만드는 방법입니다.

## 1. 개요 (Architecture)
*   **Trigger**: CodePipeline의 `Deploy` 단계 성공 후.
*   **Action**: AWS Lambda 함수 실행.
*   **Result**: CloudFront에 `/*` 경로 무효화 요청 전송.

## 2. 권한 설정 (IAM Role)
Lambda가 CloudFront에 명령을 내리려면 권한이 필요합니다.

1.  AWS 콘솔 > **IAM** > **역할(Roles)** > **역할 만들기**.
2.  **신뢰할 수 있는 엔터티**: **AWS 서비스** -> **Lambda** 선택.
3.  **권한 정책(Permissions)**: `CloudFrontFullAccess` 검색 후 체크.
    *   (보안을 더 신경 쓴다면 `cloudfront:CreateInvalidation`만 있는 커스텀 정책 권장)
4.  **역할 이름**: `Lambda-CloudFront-Invalidation-Role` (예시) 입력 후 생성.

## 3. Lambda 함수 생성
1.  AWS 콘솔 > **Lambda** > **함수 생성**.
2.  **함수 이름**: `Auto-Invalidate-CloudFront`.
3.  **런타임**: `Python 3.12` (또는 최신 버전).
4.  **실행 역할**: **기존 역할 사용** -> 위에서 만든 `Lambda-CloudFront-Invalidation-Role` 선택.
5.  **코드 작성**:
    아래 코드를 `lambda_function.py`에 복사해서 붙여넣고 **[Deploy]** 누릅니다.
    ```python
    import boto3
    import time
    import os
    import json

    def lambda_handler(event, context):
        client = boto3.client('cloudfront')
        distribution_id = os.environ.get('CLOUDFRONT_DISTRIBUTION_ID')
        
        if not distribution_id:
            raise Exception("Missing CLOUDFRONT_DISTRIBUTION_ID env var")

        try:
            response = client.create_invalidation(
                DistributionId=distribution_id,
                InvalidationBatch={
                    'Paths': {'Quantity': 1, 'Items': ['/*']},
                    'CallerReference': str(time.time())
                }
            )
            print(f"Invalidation started: {response['Invalidation']['Id']}")
            return {'userId': 'pipeline', 'statusCode': 200, 'body': json.dumps("Success")}
        except Exception as e:
            print(e)
            raise e
    ```

## 4. 환경 변수 설정
Lambda가 "어떤 CloudFront"를 지울지 알아야 합니다.

1.  Lambda 화면 > **구성(Configuration)** 탭 > **환경 변수(Environment variables)**.
2.  **편집** -> **환경 변수 추가**.
    *   **키**: `CLOUDFRONT_DISTRIBUTION_ID`
    *   **값**: `E1XXXXXX` (CloudFront 배포 ID 입력)
3.  **저장**.

## 5. CodePipeline 연결
마지막으로 파이프라인 끝에 이 Lambda를 연결합니다.

1.  AWS 콘솔 > **CodePipeline** > 내 파이프라인 선택 > **편집(Edit)**.
2.  가장 마지막 단계(Deploy) 아래의 **[+ 스테이지 추가]** 클릭.
    *   **스테이지 이름**: `Invalidate-Cache`.
3.  생성된 스테이지에서 **[+ 작업 그룹 추가]** 클릭.
    *   **작업 이름**: `InvalidateCloudFront`.
    *   **작업 공급자**: `AWS Lambda`.
    *   **함수 이름**: 방금 만든 `Auto-Invalidate-CloudFront` 선택.
    *   **사용자 파라미터**: (비워둠).
4.  **완료** -> **저장**.

## 6. 테스트
*   파이프라인을 **변경 사항 릴리스(Release change)** 버튼으로 다시 돌려보세요.
*   Deploy가 끝나면 -> Invalidate 단계가 초록색으로 성공하는지 확인합니다.
*   CloudFront 콘솔 > **무효화(Invalidations)** 탭에 가보면 "진행 중"인 항목이 보일 것입니다.
