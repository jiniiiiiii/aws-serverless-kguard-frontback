#docker run -p 3000:3000 \
#	-e AWS_REGION=ap-northeast-2 \
#	-v ~/.aws:/jini/.aws --rm \
#	attendance-check:latest
docker run -p 3000:3000 \
  -e AWS_REGION=ap-northeast-2 \
  -e AWS_ACCESS_KEY_ID= \
  -e AWS_SECRET_ACCESS_KEY= --rm \
  attendance-check
