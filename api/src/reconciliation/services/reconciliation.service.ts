import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Subject } from "rxjs";
import { Mapper } from "src/costing/utilities/mapper";
import { S3Handler } from "src/costing/utilities/s3Handler";
import { ComponentReconcile } from "src/typeorm/reconciliation/component-reconcile.entity";
import { Component } from "src/typeorm/reconciliation/component.entity";
import { EnvironmentReconcile } from "src/typeorm/reconciliation/environment-reconcile.entity";
import { Environment } from "src/typeorm/reconciliation/environment.entity";
import { Notification } from "src/typeorm/reconciliation/notification.entity";
import { Like, Not } from "typeorm";
import { Repository } from "typeorm/repository/Repository";
import { ComponentDto } from "../dtos/component.dto";
import { ComponentAudit } from "../dtos/componentAudit.dto";
import { EnvironmentDto } from "../dtos/environment.dto";
import { EnvironmentAudit } from "../dtos/environmentAudit.dto";
import { NotificationDto } from "../dtos/notification.dto";
import { EvnironmentReconcileDto } from "../dtos/reconcile.Dto";

@Injectable()
export class ReconciliationService {
  readonly notifyStream: Subject<{}> = new Subject<{}>();
  readonly notificationStream: Subject<{}> = new Subject<Notification>();
  readonly applicationStream: Subject<any> = new Subject<any>();
  private readonly s3h = S3Handler.instance();
  private readonly notFound = "";
  private readonly zlEnvironment = process.env.ZL_ENVIRONMENT || "multitenant";
  constructor(
    @InjectRepository(EnvironmentReconcile)
    private readonly environmentReconcileRepository: Repository<EnvironmentReconcile>,
    @InjectRepository(ComponentReconcile)
    private readonly componentReconcileRepository: Repository<ComponentReconcile>,
    @InjectRepository(Component)
    private readonly componentRepository: Repository<Component>,
    @InjectRepository(Environment)
    private readonly environmentRepository: Repository<Environment>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>
  ) {
    setInterval(() => {
      this.notifyStream.next({});
      this.notificationStream.next({});
      this.applicationStream.next({});
    }, 20000);
  }

  async putEnvironment(environment: EnvironmentDto) {
    const existing = await this.environmentRepository.findOne({
      where: {
        environmentName: environment.environmentName,
      },
    });
    if (!existing) {
      return await this.environmentRepository.save({
        environmentName: environment.environmentName,
        duration: environment.duration,
      });
    }
    existing.duration = environment.duration;
    const entry = await this.environmentRepository.save(existing);
    this.notifyApplications(entry.environmentName);
    return entry;
  }

  async putComponent(component: ComponentDto) {
    const existing = await this.componentRepository.findOne({
      where: {
        componentName: component.componentName,
      },
    });
    if (!existing) {
      const environment = await this.environmentRepository.findOne({
        where: {
          environmentName: component.environmentName,
        },
      });
      if (!environment) {
        throw `No parent environment named "${component.environmentName}" found!`;
      }
      const entry = await this.componentRepository.save({
        componentName: component.componentName,
        duration: component.duration,
        environment,
      });
      this.notifyApplications(component.environmentName);
      return entry;
    }
    existing.duration = component.duration;
    const entry = await this.componentRepository.save(existing);
    const applications = this.environmentRepository.findOne({
      where: {
        environmentName: component.environmentName,
      },
    });
    this.notifyApplications(component.environmentName);
    return entry;
  }

  async getComponent(id: string) {
    return await this.componentRepository.findOne({
      where: {
        componentName: id,
      },
    });
  }

  async getEnvironment(id: string) {
    return await this.environmentRepository.findOne({
      where: {
        environmentName: id,
      },
    });
  }

  async saveOrUpdateEnvironment(runData: EvnironmentReconcileDto) {
    const reconcileId = Number.isNaN(parseInt(runData.reconcileId))
      ? null
      : parseInt(runData.reconcileId);

    let savedEntry: EnvironmentReconcile = null;
    if (reconcileId) {
      const existingEntry = await this.environmentReconcileRepository.findOne(
        reconcileId
      );
      existingEntry.end_date_time = runData.endDateTime;
      existingEntry.status = runData.status;
      savedEntry = await this.environmentReconcileRepository.save(
        existingEntry
      );
      const ed = new Date(savedEntry.end_date_time).getTime();
      const sd = new Date(savedEntry.start_date_time).getTime();
      const duration = ed - sd;
      await this.putEnvironment({
        environmentName: savedEntry.name,
        duration,
      });
    } else {
      const entry: EnvironmentReconcile = {
        reconcile_id: reconcileId,
        name: runData.name,
        start_date_time: runData.startDateTime,
        team_name: runData.teamName,
        status: runData.status,
        end_date_time: runData.endDateTime,
      };
      await this.updateSkippedWorkflows<EnvironmentReconcile>(
        entry.name,
        this.environmentReconcileRepository
      );
      savedEntry = await this.environmentReconcileRepository.save(entry);
      await this.putEnvironment({
        environmentName: savedEntry.name,
        duration: -1,
      });
    }
    this.notifyStream.next(savedEntry);
    return savedEntry.reconcile_id;
  }

  async saveOrUpdateComponent(runData: EvnironmentReconcileDto) {
    const reconcileId = Number.isNaN(parseInt(runData.reconcileId))
      ? null
      : parseInt(runData.reconcileId);
    if (!reconcileId) {
      throw "Reconcile Id is mandatory to save or update component";
    }
    const savedEntry = await this.environmentReconcileRepository.findOne(
      reconcileId
    );

    let componentEntry: ComponentReconcile = Mapper.mapToComponentReconcile(
      savedEntry,
      runData.componentReconciles
    )[0];

    if (!componentEntry.reconcile_id) {
      await this.updateSkippedWorkflows<ComponentReconcile>(
        componentEntry.name,
        this.componentReconcileRepository
      );
    }
    let duration = -1;
    if (componentEntry.reconcile_id) {
      const existingEntry = await this.componentReconcileRepository.findOne(
        componentEntry.reconcile_id
      );
      existingEntry.end_date_time = componentEntry.end_date_time;
      existingEntry.status = componentEntry.status;
      componentEntry = existingEntry;
      const ed = new Date(existingEntry.end_date_time).getTime();
      const sd = new Date(existingEntry.start_date_time).getTime();
      duration = ed - sd;
    }

    await this.putComponent({
      componentName: componentEntry.name,
      duration,
      environmentName: savedEntry.name,
    });

    const entry = await this.componentReconcileRepository.save(componentEntry);
    this.notifyStream.next(entry);
    return entry.reconcile_id;
  }

  async updateSkippedWorkflows<T>(id: any, repo: Repository<T>) {
    const entries = await repo.find({
      where: {
        name: id,
        end_date_time: null,
      },
    });
    if (entries.length > 0) {
      const newEntries = entries.map((entry) => ({
        ...entry,
        status: "skipped_reconcile",
      })) as any;
      await repo.save(newEntries);
    }
  }

  async getComponentAuditList(id: string): Promise<ComponentAudit[]> {
    const components = await this.componentReconcileRepository.find({
      where: {
        name: id,
      },
    });
    return Mapper.getComponentAuditList(components);
  }

  async getEnvironmentAuditList(id: string): Promise<EnvironmentAudit[]> {
    const environments = await this.environmentReconcileRepository.find({
      where: {
        name: id,
      },
    });
    return Mapper.getEnvironmentAuditList(environments);
  }

  async getLogs(
    companyId: string,
    team: string,
    environment: string,
    component: string,
    id: number
  ) {
    try {
      const prefix = `${team}/${environment}/${component}/${id}/`;
      const objects = await this.s3h.getObjects(
        `zlifecycle-${this.zlEnvironment}-tfplan-${companyId}`,
        prefix
      );
      return objects.map((o) => ({
        key: o.key,
        body: o.data.Body.toString(),
      }));
    } catch (err) {
      if (err === this.notFound) {
        return err;
      }
    }
  }

  async getApplyLogs(
    companyId: string,
    team: string,
    environment: string,
    component: string,
    id: number,
    latest: boolean
  ) {
    const logs =
      latest === true
        ? await this.getLatestLogs(companyId, team, environment, component)
        : await this.getLogs(companyId, team, environment, component, id);
    if (Array.isArray(logs)) {
      return logs.filter((e) => e.key.includes("apply_output"));
    }
    return logs;
  }

  async getPlanLogs(
    companyId: string,
    team: string,
    environment: string,
    component: string,
    id: number,
    latest: boolean
  ) {
    const logs =
      latest === true
        ? await this.getLatestLogs(companyId, team, environment, component)
        : await this.getLogs(companyId, team, environment, component, id);
    if (Array.isArray(logs)) {
      return logs.filter((e) => e.key.includes("plan_output"));
    }
    return logs;
  }

  async getLatestLogs(
    companyId: string,
    team: string,
    environment: string,
    component: string
  ) {
    const latestAuditId = await this.getLatestAudit(
      `${team}-${environment}-${component}`
    );
    if (latestAuditId.length === 0) {
      return this.notFound;
    }
    const logs = await this.getLogs(
      companyId,
      team,
      environment,
      component,
      latestAuditId[0].reconcile_id
    );
    if (Array.isArray(logs)) {
      return logs;
    }
    return logs;
  }

  async patchApprovedBy(email: string, componentId: string) {
    const latestAudit = await this.getLatestAudit(componentId);
    if (latestAudit.length === 0) {
      return this.notFound;
    }
    latestAudit[0].approved_by = email;
    return await this.componentReconcileRepository.save(latestAudit[0]);
  }

  async getApprovedBy(id: string, rid: string) {
    if (rid === "-1") {
      const latestAudit = await this.getLatestAudit(id);
      if (latestAudit.length === 0) {
        return this.notFound;
      }
      return latestAudit[0];
    }
    return await this.componentReconcileRepository.findOne({
      where : {
        reconcile_id : rid
      }
    });
  }

  async putObject(
    customerId: string,
    path: string,
    contents: Express.Multer.File
  ) {
    return await this.s3h.copyToS3(
      `zlifecycle-${this.zlEnvironment}-tfplan-${customerId}`,
      path,
      contents
    );
  }

  async downloadObject(customerId: string, path: string) {
    return await this.s3h.getObjectStream(
      `zlifecycle-${this.zlEnvironment}-tfplan-${customerId}`,
      path
    );
  }

  async getStateFile(
    companyId: string,
    team: string,
    environment: string,
    component: string
  ) {
    const prefix = `${team}/${environment}/${component}/terraform.tfstate`;
    const resp = await this.s3h.getObject(
      `zlifecycle-${this.zlEnvironment}-tfstate-${companyId}`,
      prefix
    );

    return {
      ...resp,
      data: (resp.data?.Body || "").toString() || "",
    };
  }

  async saveNotification(notification: NotificationDto) {
    const notificationEntity: Notification = {
      company_id: notification.companyId,
      environment_name: notification.environmentName,
      message: notification.message,
      team_name: notification.teamName,
      timestamp: notification.timestamp,
      message_type: notification.messageType,
      debug: notification.debug,
    };
    const savedEntity = await this.notificationRepository.save(
      notificationEntity
    );
    this.notificationStream.next(savedEntity);
  }

  getNotification(companyId: string, teamName: string) {
    this.notificationRepository
      .find({
        where: {
          company_id: companyId,
          team_name: teamName,
          seen: false,
        },
      })
      .then((notification) => {
        notification.forEach((e) => this.notificationStream.next(e));
      });
  }

  async getAllNotification(companyId: string, teamName: string) {
    return await this.notificationRepository.find({
      where: {
        company_id: companyId,
        team_name: teamName,
      },
      order: {
        notification_id: "DESC",
      },
      take: 20,
    });
  }

  async setSeenStatusForNotification(notificationId: number) {
    await this.notificationRepository.save({
      notification_id: notificationId,
      seen: true,
    });
  }

  private async notifyApplications(environmentName: string) {
    const apps = await this.environmentRepository.find({
      where: {
        environmentName: environmentName,
      },
    });
    this.applicationStream.next(apps);
  }

  private async getLatestAudit(componentId) {
    const latestAuditId = await this.componentReconcileRepository.find({
      where: {
        name: componentId,
        status: Not(Like("skipped%")),
      },
      order: {
        start_date_time: -1,
      },
      take: 1,
    });

    return latestAuditId;
  }
}
