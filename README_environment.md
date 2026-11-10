# System Environment Variables Setting For Alibaba Secrets Manager Client V2

Use Alibaba Secrets Manager client v2 by system environment variables with the below ways:

* Use access key to access aliyun kms, you must set the following system environment variables (for linux):

	- export credentials\_type=ak
	- export credentials\_access\_key\_id=\<your access key id>
	- export credentials\_access\_secret=\<your access key secret>
	- export cache\_client\_region\_id=[{"regionId":"\<your region id>"}]
```
tips:
 	When accessing KMS instance gateway, use the following configuration
	export cache_client_region_id=[{"regionId":"<your region id>","endpoint":"<your kms instanceId>.cryptoservice.kms.aliyuncs.com"}]
```

* Use ECS RAM role to access aliyun kms, you must set the following system environment variables (for linux):

	- export credentials\_type=ecs\_ram\_role
	- export credentials\_role\_name=\<role name>
	- export cache\_client\_region\_id=[{"regionId":"\<your region id>"}]
```
tips:
 	When accessing KMS instance gateway, use the following configuration
	export cache_client_region_id=[{"regionId":"<your region id>","endpoint":"<your kms instanceId>.cryptoservice.kms.aliyuncs.com"}]
```

* Use OIDC Role ARN to access aliyun kms, you must set the following system environment variables (for linux):

	- export credentials\_type=oidc\_role\_arn
	- export credentials\_role\_arn=\<role arn> (optional, if not set, the default Aliyun configuration reading rules will be used)
	- export credentials\_oidc\_provider\_arn=\<oidc provider arn> (optional, if not set, the default Aliyun configuration reading rules will be used)
	- export credentials\_oidc\_token\_file\_path=\<oidc token file path> (optional, if not set, the default Aliyun configuration reading rules will be used)
	- export cache\_client\_region\_id=[{"regionId":"\<your region id>"}]
```
tips:
 	When accessing KMS instance gateway, use the following configuration
	export cache_client_region_id=[{"regionId":"<your region id>","endpoint":"<your kms instanceId>.cryptoservice.kms.aliyuncs.com"}]
```

* Use Cloud Native ECS Instance Identity to access Alibaba Cloud KMS, you must set the following system environment variables (for linux):

	- export credentials_type=ecs_instance_identity
	- export aap_arn=\<aap arn>
	- export cache_client_region_id=[{"regionId":"\<your region id>"}]
```
tips:
 	When accessing KMS instance gateway, use the following configuration
	export cache_client_region_id=[{"regionId":"<your region id>","endpoint":"<your kms instanceId>.cryptoservice.kms.aliyuncs.com"}]
```

* Use Cloud Native ACK OIDC JWT to access Alibaba Cloud KMS, you must set the following system environment variables (for linux):

	- export credentials_type=ack_oidc_jwt
	- export aap_arn=\<aap arn>
	- export token_path=\<oidc token file path>
	- export cache_client_region_id=[{"regionId":"\<your region id>"}]
```
tips:
 	When accessing KMS instance gateway, use the following configuration
	export cache_client_region_id=[{"regionId":"<your region id>","endpoint":"<your kms instanceId>.cryptoservice.kms.aliyuncs.com"}]
```

* Use Cloud Native ClientKey to access Alibaba Cloud KMS, you must set the following system environment variables (for linux):

	- export credentials_type=client_key
	- export client_key_private_key_path=\<client key config path>
	- export client_key_password_from_file_path=\<password file path> (choose one with client_key_password_from_env_variable)
  # - export client_key_password_from_env_variable=\<env name> (choose one with client_key_password_from_file_path)
	- export cache_client_region_id=[{"regionId":"\<your region id>"}]
```
tips:
 	When accessing KMS instance gateway, use the following configuration
	export cache_client_region_id=[{"regionId":"<your region id>","endpoint":"<your kms instanceId>.cryptoservice.kms.aliyuncs.com"}]
```