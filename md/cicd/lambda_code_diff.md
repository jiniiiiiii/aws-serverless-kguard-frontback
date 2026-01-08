# CloudFront Invalidation Lambda 코드 변경 내역

CodePipeline이 Lambda가 끝날 때까지 무한정 기다리는(Timeout) 문제를 해결하기 위해 코드를 수정했습니다.
CodePipeline은 Lambda를 호출만 하고 끝내는 게 아니라, **"성공했다/실패했다"는 신호(Signal)를 되돌려 받을 때까지 대기**하기 때문입니다.

## 1. 주요 변경 사항 요약

| 변경 항목 | 설명 | 이유 |
| :--- | :--- | :--- |
| **CodePipeline Client 추가** | `boto3.client('codepipeline')` | 파이프라인에 신호를 보내기 위해 필요함 |
| **Job ID 추출** | `event['CodePipeline.job']['id']` | 현재 실행 중인 파이프라인 작업의 고유 번호를 알아야 함 |
| **성공 신호 전송** | `put_job_success_result` | 작업이 잘 끝났음을 파이프라인에 알림 (이게 없으면 파이프라인이 계속 기다림) |
| **실패 신호 전송** | `put_job_failure_result` | 에러가 났음을 파이프라인에 알림 (그래야 파이프라인이 빨간색으로 멈춤) |

## 2. 코드 비교 (Diff)

```python
import boto3
import time
import os
import json

def lambda_handler(event, context):
    print("Event received:", json.dumps(event))
    
    # [변경 1] CodePipeline Job ID 추출
    # 파이프라인이 보낸 이벤트에는 'CodePipeline.job' 정보가 들어있음
    job_id = None
    if 'CodePipeline.job' in event:
        job_id = event['CodePipeline.job']['id']
    
    # [변경 2] CodePipeline 클라이언트 생성
    cloudfront = boto3.client('cloudfront')
    codepipeline = boto3.client('codepipeline')  # 추가됨
    
    try:
        # (중략: 배포 ID 가져오기 로직은 동일)
        # (중략: CloudFront 무효화 요청 로직은 동일)
        
        inv_id = response['Invalidation']['Id']
        print(f"Invalidation ID: {inv_id}")
        
        # [변경 3] 성공 신호 보내기 (Success Signal)
        # 이걸 보내야 파이프라인이 "아, 끝났구나" 하고 초록색으로 변함
        if job_id:
            codepipeline.put_job_success_result(jobId=job_id)
            
        return "Success"
        
    except Exception as e:
        print(f"Error: {str(e)}")
        
        # [변경 4] 실패 신호 보내기 (Failure Signal)
        # 에러가 났을 때 그냥 죽어버리면(Timeout) 파이프라인은 이유를 모름
        # 명시적으로 "실패했다"고 알려줌
        if job_id:
            codepipeline.put_job_failure_result(
                jobId=job_id,
                failureDetails={
                    'type': 'JobFailed',
                    'message': str(e)
                }
            )
        raise e
```

## 3. 필수 조치 사항 (다시 강조)
코드가 바뀌었으므로 **IAM 권한**도 반드시 추가되어야 합니다.
Lambda가 `codepipeline:PutJobSuccessResult` API를 호출할 권한이 없으면, **"권한 없음 오류"로 또 실패**하게 됩니다.

`Lambda-CloudFront-Invalidation-Role` 역할에 아래 권한이 있는지 꼭 확인해 주세요.
```json
"Action": [
  "codepipeline:PutJobSuccessResult",
  "codepipeline:PutJobFailureResult"
]
```
