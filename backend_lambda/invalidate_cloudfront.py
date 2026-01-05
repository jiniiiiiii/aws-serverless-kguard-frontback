import boto3
import time
import os
import json

def lambda_handler(event, context):
    print("Event received:", json.dumps(event))
    
    # [설명] CodePipeline에서 넘어온 이벤트에는 'job' 정보가 들어있습니다.
    # 성공/실패 신호를 보내려면 이 Job ID가 반드시 필요합니다.
    job_id = None
    if 'CodePipeline.job' in event:
        job_id = event['CodePipeline.job']['id']
    
    # [설명] AWS 서비스 클라이언트 생성
    cloudfront = boto3.client('cloudfront')
    codepipeline = boto3.client('codepipeline') # CodePipeline에 신호 보내기용
    
    try:
        # 1. 환경 변수에서 CloudFront 배포 ID 가져오기
        distribution_id = os.environ.get('CLOUDFRONT_DISTRIBUTION_ID')
        
        if not distribution_id:
            raise Exception("환경 변수 CLOUDFRONT_DISTRIBUTION_ID가 없습니다.")
            
        # 2. CloudFront 캐시 무효화(Invalidation) 요청 생성
        # '/*' 경로는 모든 파일을 의미하여, 전체 캐시를 삭제합니다.
        print(f"CloudFront 배포 ID 무효화 시도: {distribution_id}")
        response = cloudfront.create_invalidation(
            DistributionId=distribution_id,
            InvalidationBatch={
                'Paths': {
                    'Quantity': 1,
                    'Items': ['/*']
                },
                'CallerReference': str(time.time()) # 중복 요청 방지용 유니크 값
            }
        )
        
        inv_id = response['Invalidation']['Id']
        print(f"무효화 요청 성공! ID: {inv_id}")
        
        # 3. [중요] CodePipeline에 "성공" 신호 보내기
        # 이 코드가 없으면 파이프라인은 Lambda가 끝난 줄 모르고 타임아웃 될 때까지 기다립니다.
        if job_id:
            print(f"CodePipeline에 성공 신호 전송 (Job ID: {job_id})")
            codepipeline.put_job_success_result(jobId=job_id)
            
        return "Success"
        
    except Exception as e:
        print(f"오류 발생: {str(e)}")
        
        # 4. [중요] CodePipeline에 "실패" 신호 보내기
        # 실패했다는 것을 명확히 알려줘야 파이프라인이 빨간색으로 표시되고 중단됩니다.
        if job_id:
            print(f"CodePipeline에 실패 신호 전송 (Job ID: {job_id})")
            codepipeline.put_job_failure_result(
                jobId=job_id,
                failureDetails={
                    'type': 'JobFailed',
                    'message': str(e)
                }
            )
        raise e
