docker run -p 3000:3000 \
	--env AWS_REGION=ap-northeast-2 \
	--env DYNAMODB_TABLE=KG-db-ddb-ap-ne-2-userdata \
	--name event-game-test --rm \
	event-game-service:26-01-09
