import { ApiType, Database, InstallationType, ProjectType } from './enums'

export interface Apis {
    type: ApiType,
    require: boolean
}

export interface SwaggerSetup {
    enabled: boolean
    path?: string
}

export interface ProjectConfig {
    projectLocation: string;
    projectName: string;
    projectType: ProjectType
    database: Database
    installationType: InstallationType
    apis: Apis[]
    socket: boolean
    swagger: SwaggerSetup,
    docker: boolean
}