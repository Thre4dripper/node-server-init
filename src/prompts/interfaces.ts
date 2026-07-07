import { ApiType, Database, InstallationType, PackageManager, ProjectType } from './enums';

export interface Apis {
    type: ApiType;
    require: boolean;
}

export interface SwaggerSetup {
    enabled: boolean;
    path?: string;
}

export interface ProjectConfig {
    projectLocation: string;
    projectName: string;
    projectType: ProjectType;
    database: Database;
    installationType: InstallationType;
    packageManager: PackageManager;
    grpc: boolean;
    redis: boolean;
    apis: Apis[];
    socket: boolean;
    cron: boolean;
    swagger: SwaggerSetup;
    docker: boolean;
}
