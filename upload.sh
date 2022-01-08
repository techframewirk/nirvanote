echo "Please Enter S3 Bucket name"  
read BUCKET_NAME
echo "Please enter S3 Region"
read REGION 
aws configure 
OUTPUT=`aws s3api create-bucket --bucket $BUCKET_NAME --region $REGION --create-bucket-configuration LocationConstraint=$REGION`
echo "$OUTPUT"
echo "Please enter images folder to upload"
read IMAGES_FOLDER
aws s3 cp $IMAGES_FOLDER s3://$BUCKET_NAME/ --recursive
aws s3 ls s3://$BUCKET_NAME/