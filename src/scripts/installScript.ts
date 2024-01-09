import path from 'node:path'
import fs from 'fs/promises'
import { note, outro, spinner } from '@clack/prompts'
import { Apis, ProjectConfig } from '../prompts/interfaces'
import { Database, InstallationType } from '../prompts/enums'
import SetupMongoose from './setupMongoose'
import SetupSequelize from './setupSequelize'
import SetupSocket from './setupSocket'
// {
//     projectLocation: 'C:\\Users\\ijlal\\Desktop\\New folder\\test',
//     projectName: 'my-project',
//     projectType: 'ts',
//     database: 'mongo',
//     installationType: 'all',
//     apis: [
//     { type: 'get', require: true },
//     { type: 'post', require: true },
//     { type: 'put', require: true },
//     { type: 'delete', require: true },
//     { type: 'patch', require: true }
// ],
//     socket: true,
//     swagger: { enabled: true, path: '/api-docs' },
//     docker: true
// }
const endPromptSession = () => {
    note(
        'This tool will now install dependencies, configure your project, and do other fancy things.',
        'Press Ctrl+C to cancel.',
    )

    outro('Thank you for using Node Initializer')
}
export const installScript = async (projectConfig: ProjectConfig) => {
    try {

        const s = spinner()
        s.start('Creating project folder')
        await createProjectFolder(projectConfig.projectLocation)
        s.stop('Created project folder')

        s.start('Setting up project name')
        await setupProjectName(projectConfig.projectLocation, projectConfig.projectName)
        s.stop('Setup project name')

        s.start('Setting up project database')
        await setupProjectDatabase(projectConfig.projectLocation, projectConfig.database)
        s.stop('Setup project database')

        if (projectConfig.installationType === InstallationType.All) {
            return
        }

        s.start('Setting up apis')
        await setupApis(projectConfig.projectLocation, projectConfig.apis)
        s.stop('Setup apis')

        s.start('Setting up socket')
        await setupSocket(projectConfig.projectLocation, projectConfig.socket)
        s.stop('Setup socket')
        // endPromptSession()
    } catch (err) {
        console.log(err)
    }
}

const createProjectFolder = async (projectLocation: string) => {
    const templateLocation = path.join(__dirname, '..', '..', 'template')
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

const setupProjectDatabase = async (projectLocation: string, database: Database) => {
    if (database === Database.Mongo) {
        await SetupMongoose.init(projectLocation)
    } else {
        await SetupSequelize.init(projectLocation, database)
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