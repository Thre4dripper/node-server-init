import path from 'node:path'
import fs from 'fs/promises'
import { outro, spinner } from '@clack/prompts'
import { Apis, ProjectConfig, SwaggerSetup } from '../prompts/interfaces'
import { ApiType, Database, InstallationType, ProjectType } from '../prompts/enums'
import SetupMongoose from './setupMongoose'
import SetupSequelize from './setupSequelize'
import SetupSocket from './setupSocket'
import SetupSwagger from './setupSwagger'
import SetupCron from './setupCron'

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

        // TODO fix these messages
        if (projectConfig.installationType === InstallationType.All) {
            return
        }

        s.start('Setting up api controllers')
        await setupApis(
            projectConfig.projectLocation,
            projectConfig.apis,
            projectConfig.projectType
        )
        s.stop('Setup api controllers')

        s.start('Configuring socket')
        await setupSocket(
            projectConfig.projectLocation,
            projectConfig.socket,
            projectConfig.projectType
        )
        s.stop('Configured socket')

        s.start('Configuring cron')
        await setupCron(
            projectConfig.projectLocation,
            projectConfig.cron,
            projectConfig.projectType
        )
        s.stop('Configured cron')

        s.start('Setting up swagger')
        await setupSwagger(
            projectConfig.projectLocation,
            projectConfig.swagger,
            projectConfig.projectType
        )
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
        scripts: { [key: string]: string }
        devDependencies: { [key: string]: string }
    }

    const nodemonConfigLocation = path.join(projectLocation, 'nodemon.json')
    const nodemonConfig = await fs.readFile(nodemonConfigLocation, 'utf8')
    const nodemonConfigObj = JSON.parse(nodemonConfig)

    if (projectType === ProjectType.Typescript) {
        packageJsonObj.scripts.start = packageJsonObj.scripts['start-ts'].replace('-typescript', '')
        packageJsonObj.scripts.dev = packageJsonObj.scripts['dev-ts']
            .replace('-typescript', '')
            .replace(/-ts/g, '')
        packageJsonObj.scripts.build = packageJsonObj.scripts.build.replace('-typescript', '')
        packageJsonObj.scripts.preview = packageJsonObj.scripts.preview.replace('-typescript', '')
        packageJsonObj.scripts.prettier = packageJsonObj.scripts['prettier-ts'].replace(
            '-typescript',
            ''
        )

        delete packageJsonObj.scripts['start-ts']
        delete packageJsonObj.scripts['dev-ts']
        delete packageJsonObj.scripts['start-js']
        delete packageJsonObj.scripts['dev-js']
        delete packageJsonObj.scripts['prettier-ts']
        delete packageJsonObj.scripts['prettier-js']

        //nodemon-ts.json file
        const nodemonTsConfig = path.join(projectLocation, 'nodemon-ts.json')
        const nodemonTsConfigContents = await fs.readFile(nodemonTsConfig, 'utf8')
        const nodemonTsConfigObj = JSON.parse(nodemonTsConfigContents)

        nodemonConfigObj.exec = nodemonTsConfigObj.exec
    } else {
        packageJsonObj.scripts.start = packageJsonObj.scripts['start-js'].replace('-javascript', '')
        packageJsonObj.scripts.dev = packageJsonObj.scripts['dev-js']
            .replace('-javascript', '')
            .replace(/-js/g, '')
        packageJsonObj.scripts.prettier = packageJsonObj.scripts['prettier-js'].replace(
            '-javascript',
            ''
        )

        delete packageJsonObj.scripts['start-ts']
        delete packageJsonObj.scripts['dev-ts']
        delete packageJsonObj.scripts['start-js']
        delete packageJsonObj.scripts['dev-js']
        delete packageJsonObj.scripts.preview
        delete packageJsonObj.scripts.build
        delete packageJsonObj.scripts['prettier-ts']
        delete packageJsonObj.scripts['prettier-js']

        // remove typescript dependencies
        // Todo remove typescript eslint dependencies also
        delete packageJsonObj.devDependencies['@types/bcrypt']
        delete packageJsonObj.devDependencies['@types/cors']
        delete packageJsonObj.devDependencies['@types/express']
        delete packageJsonObj.devDependencies['@types/jsonwebtoken']
        delete packageJsonObj.devDependencies['@types/morgan']
        delete packageJsonObj.devDependencies['@types/node']
        delete packageJsonObj.devDependencies['@types/swagger-ui-express']
        delete packageJsonObj.devDependencies['copyfiles']
        delete packageJsonObj.devDependencies['ts-node']
        delete packageJsonObj.devDependencies['typescript']

        // nodemon-js.json file
        const nodemonJsConfig = path.join(projectLocation, 'nodemon-js.json')
        const nodemonJsConfigContents = await fs.readFile(nodemonJsConfig, 'utf8')
        const nodemonJsConfigObj = JSON.parse(nodemonJsConfigContents)

        nodemonConfigObj.exec = nodemonJsConfigObj.exec.replace('-javascript', '')
    }

    //save changes and delete nodemon-ts.json and nodemon-js.json
    await Promise.all([
        fs.writeFile(packageJsonLocation, JSON.stringify(packageJsonObj, null, 2)),
        fs.writeFile(nodemonConfigLocation, JSON.stringify(nodemonConfigObj, null, 2)),
        fs.rm(path.join(projectLocation, 'nodemon-ts.json')),
        fs.rm(path.join(projectLocation, 'nodemon-js.json')),
    ])
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

const setupApis = async (projectLocation: string, apis: Apis[], projectType: ProjectType) => {
    const masterControllerLocation = path.join(
        projectLocation,
        'src',
        'app',
        'utils',
        `MasterController.${projectType}`
    )
    const masterControllerContents = await fs.readFile(masterControllerLocation, 'utf8')

    const masterControllerLines = masterControllerContents.split('\n')

    const linesToBeRemoved: number[] = []

    //removing api controllers from master controller
    apis.forEach((api) => {
        if (!api.require) {
            const apiDocStartLine = masterControllerLines.findIndex((line) =>
                line.includes(`${api.type.toUpperCase()}`)
            )
            const apiStartLine = masterControllerLines.findIndex((line) =>
                line.includes(`static ${api.type}(`)
            )
            const apiEndLine = masterControllerLines.findIndex(
                (line, index) => line.includes('}') && index > apiStartLine
            )

            for (let i = apiDocStartLine - 2; i <= apiEndLine; i++) {
                linesToBeRemoved.push(i)
            }
        }
    })

    const filteredMasterControllerLines = masterControllerLines.filter(
        (_, index) => !linesToBeRemoved.includes(index)
    )

    const masterControllerModified = filteredMasterControllerLines.join('\n')
    await fs.writeFile(masterControllerLocation, masterControllerModified)

    //changes in routes
    const routesLocation = path.join(
        projectLocation,
        'src',
        'app',
        'routes',
        `user.routes.${projectType}`
    )
    const routesContents = await fs.readFile(routesLocation, 'utf8')

    const availableMethods = apis.filter((api) => api.require).map((api) => api.type)

    // prefer POST method if available
    const availableMethod = availableMethods.includes(ApiType.POST)
        ? ApiType.POST
        : availableMethods[0]

    const routesModified = routesContents.replace(
        /(get|post|put|delete|patch)\(/g,
        `${availableMethod}(`
    )
    await fs.writeFile(routesLocation, routesModified)
}

const setupSocket = async (projectLocation: string, socket: boolean, projectType: ProjectType) => {
    await SetupSocket.init(projectLocation, socket, projectType)
}

const setupCron = async (projectLocation: string, cron: boolean, projectType: ProjectType) => {
    await SetupCron.init(projectLocation, cron, projectType)
}

const setupSwagger = async (
    projectLocation: string,
    swagger: SwaggerSetup,
    projectType: ProjectType
) => {
    await SetupSwagger.init(projectLocation, swagger, projectType)
}

const setupDocker = async (projectLocation: string, docker: boolean) => {
    if (docker) {
        return
    }

    //TODO make a setup docker class with handler as folders

    //remove docker files
    const dockerfileDevLocation = path.join(projectLocation, 'Dockerfile-dev')
    const dockerfileProdLocation = path.join(projectLocation, 'Dockerfile-prod')

    await fs.rm(dockerfileDevLocation)
    await fs.rm(dockerfileProdLocation)

    const dockerComposeLocation = path.join(projectLocation, 'docker-compose.yml')
    await fs.rm(dockerComposeLocation)

    const dockerIgnoreLocation = path.join(projectLocation, '.dockerignore')
    await fs.rm(dockerIgnoreLocation)
}
