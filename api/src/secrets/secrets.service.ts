import { Injectable } from "@nestjs/common";
import { AWSError } from "aws-sdk";
import { AwsSecretDto } from "./dtos/aws-secret.dto";
import { AWSSSMHandler } from "./utilities/awsSsmHandler";

@Injectable()
export class SecretsService {
  awsSecretSeparator = "[compuzest-shared]";
  k8sApi = null;
  ssm: AWSSSMHandler = null;
  constructor() {
    const k8s = require("@kubernetes/client-node");
    const kc = new k8s.KubeConfig();
    kc.loadFromCluster();
    this.k8sApi = kc.makeApiClient(k8s.CoreV1Api);
    this.ssm = AWSSSMHandler.instance();
  }

  private async updateSecret(
    client: any,
    secret: any,
    inputs: any,
    namespace: string,
    name: string
  ) {
    if (!secret) {
      return client
        .createNamespacedSecret(namespace, {
          metadata: {
            name,
            namespace,
          },
          type: "Opaque",
          data: inputs,
        })
        .then((x) => x.body);
    }

    secret.data = inputs;

    return client
      .replaceNamespacedSecret(name, namespace, secret)
      .then((x) => x.body);
  }

  private stringToBase64(value: string) {
    return Buffer.from(value).toString("base64");
  }

  private base64ToString(value: string) {
    return Buffer.from(value, "base64").toString();
  }

  private getCredentialFileInput(
    credentials: string,
    accessKeyId: string,
    secretAccessKey: string
  ) {
    const decoded = this.base64ToString(credentials);
    const splitTokens = decoded.split(this.awsSecretSeparator);
    const updatedCreds = splitTokens[0].replace(
      /aws_access_key_id = \S+\naws_secret_access_key = \S+/,
      `aws_access_key_id = ${this.base64ToString(
        accessKeyId
      )}\naws_secret_access_key = ${this.base64ToString(secretAccessKey)}`
    );
    splitTokens[0] = updatedCreds;
    return this.stringToBase64(splitTokens.join(this.awsSecretSeparator));
  }

  public async createOrUpdateSecret(
    accessKeyId: string,
    secretAccessKey: string
  ) {
    const credentials = await this.k8sApi
      .readNamespacedSecret("aws-credentials-file", "argocd")
      .then((x) => x.body)
      .catch(() => null);

    const secret2 = await this.k8sApi
      .readNamespacedSecret("aws-creds", "argocd")
      .then((x) => x.body)
      .catch(() => null);

    const updates = [];
    updates.push(
      this.updateSecret(
        this.k8sApi,
        secret2,
        {
          aws_access_key_id: accessKeyId,
          aws_secret_access_key: secretAccessKey,
        },
        "argocd",
        "aws-creds"
      )
    );

    if (credentials) {
      const encoded = this.getCredentialFileInput(
        credentials.data.credentials,
        accessKeyId,
        secretAccessKey
      );
      updates.push(
        this.updateSecret(
          this.k8sApi,
          credentials,
          { credentials: encoded },
          "argocd",
          "aws-credentials-file"
        )
      );
    }

    const res = await Promise.all(updates);

    return res;
  }

  public async secretExist() {
    const credentials = await this.k8sApi
      .readNamespacedSecret("aws-credentials-file", "argocd")
      .then((x) => x.body)
      .catch(() => null);

    const secret2 = await this.k8sApi
      .readNamespacedSecret("aws-creds", "argocd")
      .then((x) => x.body)
      .catch(() => null);

    if (credentials && secret2) {
      return true;
    }
    return false;
  }

  public async ssmSecretExists(pathName: string) {
    try {
      const awsRes = await this.ssm.getParameter({
        Name: pathName,
      });
      return true;
    } catch (err) {
      const e = err as AWSError;
      if (e.code === "ParameterNotFound") {
        return false;
      } else {
        throw err;
      }
    }
  }

  public async ssmSecretsExists(pathNames: string[]) {
    try {
      const awsRes = await this.ssm.getParameters({
        Names: pathNames
      });
      return awsRes.InvalidParameters.length === 0;
    } catch (err) {
      const e = err as AWSError;
      if (e.code === "ParameterNotFound") {
        return false;
      } else {
        throw err;
      }
    }
  }

  public async getSsmSecretsByPath(path: string) {
    try {
      const awsRes = await this.ssm.getParametersByPath({
        Path: path,
        Recursive: true,
        WithDecryption: false,
      });
      return awsRes.Parameters;
    } catch (err) {
      const e = err as AWSError;
      if (e.code === "ParameterNotFound") {
        return false;
      } else {
        throw err;
      }
    }
  }

  public async putSsmSecrets(awsSecrets: AwsSecretDto[]) {
    const awsCalls = awsSecrets.map(secret => this.putSsmSecret(secret.path, secret.value, 'SecureString'));
    const responses = await Promise.all(awsCalls);
    return !responses.some(response => response === false);
  }

  public async putSsmSecret(
    pathName: string,
    value: string,
    type: "SecureString" | "StringList" | "String"
  ): Promise<boolean> {
    try {
      const awsRes = await this.ssm.putParameter({
        Name: pathName,
        Value: value,
        Overwrite: true,
        Type: type,
      });
      return true;
    } catch (err) {
      const e = err as AWSError;
      if (e.code === "ParameterNotFound") {
        return false;
      } else {
        throw err;
      }
    }
  }
}
