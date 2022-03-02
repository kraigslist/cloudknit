// Code generated by smithy-go-codegen DO NOT EDIT.

package ssm

import (
	"context"
	awsmiddleware "github.com/aws/aws-sdk-go-v2/aws/middleware"
	"github.com/aws/aws-sdk-go-v2/aws/signer/v4"
	"github.com/aws/aws-sdk-go-v2/service/ssm/types"
	"github.com/aws/smithy-go/middleware"
	smithyhttp "github.com/aws/smithy-go/transport/http"
)

// Lists the tasks in a maintenance window. For maintenance window tasks without a
// specified target, you can't supply values for --max-errors and
// --max-concurrency. Instead, the system inserts a placeholder value of 1, which
// may be reported in the response to this command. These values don't affect the
// running of your task and can be ignored.
func (c *Client) GetMaintenanceWindowTask(ctx context.Context, params *GetMaintenanceWindowTaskInput, optFns ...func(*Options)) (*GetMaintenanceWindowTaskOutput, error) {
	if params == nil {
		params = &GetMaintenanceWindowTaskInput{}
	}

	result, metadata, err := c.invokeOperation(ctx, "GetMaintenanceWindowTask", params, optFns, c.addOperationGetMaintenanceWindowTaskMiddlewares)
	if err != nil {
		return nil, err
	}

	out := result.(*GetMaintenanceWindowTaskOutput)
	out.ResultMetadata = metadata
	return out, nil
}

type GetMaintenanceWindowTaskInput struct {

	// The maintenance window ID that includes the task to retrieve.
	//
	// This member is required.
	WindowId *string

	// The maintenance window task ID to retrieve.
	//
	// This member is required.
	WindowTaskId *string

	noSmithyDocumentSerde
}

type GetMaintenanceWindowTaskOutput struct {

	// The action to take on tasks when the maintenance window cutoff time is reached.
	// CONTINUE_TASK means that tasks continue to run. For Automation, Lambda, Step
	// Functions tasks, CANCEL_TASK means that currently running task invocations
	// continue, but no new task invocations are started. For Run Command tasks,
	// CANCEL_TASK means the system attempts to stop the task by sending a
	// CancelCommand operation.
	CutoffBehavior types.MaintenanceWindowTaskCutoffBehavior

	// The retrieved task description.
	Description *string

	// The location in Amazon Simple Storage Service (Amazon S3) where the task results
	// are logged. LoggingInfo has been deprecated. To specify an Amazon Simple Storage
	// Service (Amazon S3) bucket to contain logs, instead use the OutputS3BucketName
	// and OutputS3KeyPrefix options in the TaskInvocationParameters structure. For
	// information about how Amazon Web Services Systems Manager handles these options
	// for the supported maintenance window task types, see
	// MaintenanceWindowTaskInvocationParameters.
	LoggingInfo *types.LoggingInfo

	// The maximum number of targets allowed to run this task in parallel. For
	// maintenance window tasks without a target specified, you can't supply a value
	// for this option. Instead, the system inserts a placeholder value of 1, which may
	// be reported in the response to this command. This value doesn't affect the
	// running of your task and can be ignored.
	MaxConcurrency *string

	// The maximum number of errors allowed before the task stops being scheduled. For
	// maintenance window tasks without a target specified, you can't supply a value
	// for this option. Instead, the system inserts a placeholder value of 1, which may
	// be reported in the response to this command. This value doesn't affect the
	// running of your task and can be ignored.
	MaxErrors *string

	// The retrieved task name.
	Name *string

	// The priority of the task when it runs. The lower the number, the higher the
	// priority. Tasks that have the same priority are scheduled in parallel.
	Priority int32

	// The Amazon Resource Name (ARN) of the Identity and Access Management (IAM)
	// service role to use to publish Amazon Simple Notification Service (Amazon SNS)
	// notifications for maintenance window Run Command tasks.
	ServiceRoleArn *string

	// The targets where the task should run.
	Targets []types.Target

	// The resource that the task used during execution. For RUN_COMMAND and AUTOMATION
	// task types, the value of TaskArn is the SSM document name/ARN. For LAMBDA tasks,
	// the value is the function name/ARN. For STEP_FUNCTIONS tasks, the value is the
	// state machine ARN.
	TaskArn *string

	// The parameters to pass to the task when it runs.
	TaskInvocationParameters *types.MaintenanceWindowTaskInvocationParameters

	// The parameters to pass to the task when it runs. TaskParameters has been
	// deprecated. To specify parameters to pass to a task when it runs, instead use
	// the Parameters option in the TaskInvocationParameters structure. For information
	// about how Systems Manager handles these options for the supported maintenance
	// window task types, see MaintenanceWindowTaskInvocationParameters.
	TaskParameters map[string]types.MaintenanceWindowTaskParameterValueExpression

	// The type of task to run.
	TaskType types.MaintenanceWindowTaskType

	// The retrieved maintenance window ID.
	WindowId *string

	// The retrieved maintenance window task ID.
	WindowTaskId *string

	// Metadata pertaining to the operation's result.
	ResultMetadata middleware.Metadata

	noSmithyDocumentSerde
}

func (c *Client) addOperationGetMaintenanceWindowTaskMiddlewares(stack *middleware.Stack, options Options) (err error) {
	err = stack.Serialize.Add(&awsAwsjson11_serializeOpGetMaintenanceWindowTask{}, middleware.After)
	if err != nil {
		return err
	}
	err = stack.Deserialize.Add(&awsAwsjson11_deserializeOpGetMaintenanceWindowTask{}, middleware.After)
	if err != nil {
		return err
	}
	if err = addSetLoggerMiddleware(stack, options); err != nil {
		return err
	}
	if err = awsmiddleware.AddClientRequestIDMiddleware(stack); err != nil {
		return err
	}
	if err = smithyhttp.AddComputeContentLengthMiddleware(stack); err != nil {
		return err
	}
	if err = addResolveEndpointMiddleware(stack, options); err != nil {
		return err
	}
	if err = v4.AddComputePayloadSHA256Middleware(stack); err != nil {
		return err
	}
	if err = addRetryMiddlewares(stack, options); err != nil {
		return err
	}
	if err = addHTTPSignerV4Middleware(stack, options); err != nil {
		return err
	}
	if err = awsmiddleware.AddRawResponseToMetadata(stack); err != nil {
		return err
	}
	if err = awsmiddleware.AddRecordResponseTiming(stack); err != nil {
		return err
	}
	if err = addClientUserAgent(stack); err != nil {
		return err
	}
	if err = smithyhttp.AddErrorCloseResponseBodyMiddleware(stack); err != nil {
		return err
	}
	if err = smithyhttp.AddCloseResponseBodyMiddleware(stack); err != nil {
		return err
	}
	if err = addOpGetMaintenanceWindowTaskValidationMiddleware(stack); err != nil {
		return err
	}
	if err = stack.Initialize.Add(newServiceMetadataMiddleware_opGetMaintenanceWindowTask(options.Region), middleware.Before); err != nil {
		return err
	}
	if err = addRequestIDRetrieverMiddleware(stack); err != nil {
		return err
	}
	if err = addResponseErrorMiddleware(stack); err != nil {
		return err
	}
	if err = addRequestResponseLogging(stack, options); err != nil {
		return err
	}
	return nil
}

func newServiceMetadataMiddleware_opGetMaintenanceWindowTask(region string) *awsmiddleware.RegisterServiceMetadata {
	return &awsmiddleware.RegisterServiceMetadata{
		Region:        region,
		ServiceID:     ServiceID,
		SigningName:   "ssm",
		OperationName: "GetMaintenanceWindowTask",
	}
}
