import path from 'node:path'
import fs from 'fs/promises'
import { outro, spinner } from '@clack/prompts'
import { Apis, ProjectConfig, SwaggerSetup } from '../prompts/interfaces'
import { Database, InstallationType, ProjectType } from '../prompts/enums'
import SetupMongoose from './setupMongoose'
import SetupSequelize from './setupSequelize'
import SetupSocket from './setupSocket'
import SetupSwagger from './setupSwagger'

export const installScript = async (projectConfig: ProjectConfig) => {
    try {
        const s = spinner()
        s.start('Creating project folder')
        await createProjectFolder(projectConfig.projectLocation, projectConfig.projectType)
        await setupProjectName(projectConfig.projectLocation, projectConfig.projectName)
        await setupProjectType(projectConfig.projectLocation, projectConfig.projectType)
        s.stop('Created project folder')

        s.start('Integrating database')
        await setupProjectDatabase(
            projectConfig.projectLocation,
            projectConfig.database,
            projectConfig.projectType
        )
        s.stop('Integrated database')

        if (projectConfig.installationType === InstallationType.All) {
            return
        }

        s.start('Setting up api controllers')
        await setupApis(projectConfig.projectLocation, projectConfig.apis)
        s.stop('Setup api controllers')

        s.start('Configuring socket')
        await setupSocket(projectConfig.projectLocation, projectConfig.socket)
        s.stop('Configured socket')

        s.start('Setting up swagger')
        await setupSwagger(projectConfig.projectLocation, projectConfig.swagger)
        s.stop('Setup swagger')

        s.start('Setting up docker')
        await setupDocker(projectConfig.projectLocation, projectConfig.docker)
        s.stop('Setup docker')

        outro('Project setup complete.')
    } catch (err) {
        console.log(err)
    }
}

const createProjectFolder = async (projectLocation: string, projectType: ProjectType) => {
    const templateLocation = path.join(__dirname, '..', '..', `template-${projectType}`)
    const projectFolder = path.join(projectLocation)
    await fs.cp(templateLocation, projectFolder, { recursive: true })
}

const setupProjectName = async (projectLocation: string, projectName: string) => {
    const packageJsonLocation = path.join(projectLocation, 'package.json')
    const packageJson = await fs.readFile(packageJsonLocation, 'utf8')
    const packageJsonObj = JSON.parse(packageJson)
    packageJsonObj.name = projectName
    await fs.writeFile(packageJsonLocation, JSON.stringify(packageJsonObj, null, 2))
}

const setupProjectType = async (projectLocation: string, projectType: ProjectType) => {
    const packageJsonLocation = path.join(projectLocation, 'package.json')
    const packageJson = await fs.readFile(packageJsonLocation, 'utf8')
    const packageJsonObj = JSON.parse(packageJson) as {
        scripts: { [key: string]: string },
        devDependencies: { [key: string]: string },
    }

    if (projectType === ProjectType.Typescript) {
        packageJsonObj.scripts.start = packageJsonObj.scripts['start-ts'].replace('-typescript', '')
        packageJsonObj.scripts.dev = packageJsonObj.scripts['dev-ts'].replace('-typescript', '')
        packageJsonObj.scripts.build = packageJsonObj.scripts.build.replace('-typescript', '')
        packageJsonObj.scripts.preview = packageJsonObj.scripts.preview.replace('-typescript', '')

        delete packageJsonObj.scripts['start-ts']
        delete packageJsonObj.scripts['dev-ts']
        delete packageJsonObj.scripts['start-js']
        delete packageJsonObj.scripts['dev-js']
    } else {
        packageJsonObj.scripts.start = packageJsonObj.scripts['start-js'].replace('-javascript', '')
        packageJsonObj.scripts.dev = packageJsonObj.scripts['dev-js'].replace('-javascript', '')

        delete packageJsonObj.scripts['start-ts']
        delete packageJsonObj.scripts['dev-ts']
        delete packageJsonObj.scripts['start-js']
        delete packageJsonObj.scripts['dev-js']
        delete packageJsonObj.scripts.preview
        delete packageJsonObj.scripts.build

        // remove typescript dependencies
        delete packageJsonObj.devDependencies['@types/bcrypt']
        delete packageJsonObj.devDependencies['@types/cors']
        delete packageJsonObj.devDependencies['@types/express']
        delete packageJsonObj.devDependencies['@types/jsonwebtoken']
        delete packageJsonObj.devDependencies['@types/morgan']
        delete packageJsonObj.devDependencies['@types/node']
        delete packageJsonObj.devDependencies['@types/swagger-ui-express']
        delete packageJsonObj.devDependencies['copyfiles']
        delete packageJsonObj.devDependencies['sequelize-typescript']
        delete packageJsonObj.devDependencies['ts-node']
        delete packageJsonObj.devDependencies['typescript']
    }

    await fs.writeFile(packageJsonLocation, JSON.stringify(packageJsonObj, null, 2))
}

const setupProjectDatabase = async (
    projectLocation: string,
    database: Database,
    projectType: ProjectType
) => {
    if (database === Database.Mongo) {
        await SetupMongoose.init(projectLocation, projectType)
    } else {
        await SetupSequelize.init(projectLocation, database, projectType)
    }
}

const setupApis = async (projectLocation: string, apis: Apis[]) => {
    const masterControllerLocation = path.join(projectLocation, 'src', 'app', 'utils', 'masterController.ts')
    const masterControllerContents = await fs.readFile(masterControllerLocation, 'utf8')

    const masterControllerLines = masterControllerContents.split('\n')

    const linesToBeRemoved: number[] = []

    //removing api controllers from master controller
    apis.forEach((api) => {
        if (!api.require) {
            const apiDocStartLine = masterControllerLines.findIndex((line) => line.includes(`${api.type.toUpperCase()}`))
            const apiStartLine = masterControllerLines.findIndex((line) => line.includes(`static ${api.type}(`))
            const apiEndLine = masterControllerLines.findIndex((line, index) => line.includes('}') && index > apiStartLine)

            for (let i = apiDocStartLine - 2; i <= apiEndLine; i++) {
                linesToBeRemoved.push(i)
            }
        }
    })

    const filteredMasterControllerLines = masterControllerLines.filter((_, index) => !linesToBeRemoved.includes(index))

    const masterControllerModified = filteredMasterControllerLines.join('\n')
    await fs.writeFile(masterControllerLocation, masterControllerModified)

    //changes in routes
    const routesLocation = path.join(projectLocation, 'src', 'app', 'routes', 'user.router.ts')
    const routesContents = await fs.readFile(routesLocation, 'utf8')

    const availableMethod = apis.filter((api) => api.require).map((api) => api.type)[0]
    const routesModified = routesContents.replace(/(get|post|put|delete|patch)\(/g, `${availableMethod}(`)
    await fs.writeFile(routesLocation, routesModified)
}

const setupSocket = async (projectLocation: string, socket: boolean) => {
    await SetupSocket.init(projectLocation, socket)
}

const setupSwagger = async (projectLocation: string, swagger: SwaggerSetup) => {
    await SetupSwagger.init(projectLocation, swagger)
}

const setupDocker = async (projectLocation: string, docker: boolean) => {
    if (docker) {
        return
    }

    //remove docker files
    const dockerfileLocation = path.join(projectLocation, 'Dockerfile')
    await fs.rm(dockerfileLocation)

    const dockerComposeLocation = path.join(projectLocation, 'docker-compose.yml')
    await fs.rm(dockerComposeLocation)

    const dockerIgnoreLocation = path.join(projectLocation, '.dockerignore')
    await fs.rm(dockerIgnoreLocation)
}