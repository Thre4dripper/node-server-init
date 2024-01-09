import path from 'node:path'
import fs from 'fs/promises'
import { note, outro, spinner } from '@clack/prompts'
import { ProjectConfig } from '../prompts/interfaces'
import { Database } from '../prompts/enums'
import SetupMongoose from './setupMongoose'
import SetupSequelize from './setupSequelize'
// {
//     projectLocation: 'C:\\Users\\ijlal\\Desktop\\New folder\\test',
//     projectName: 'my-project',
//     projectType: 'ts',
//     installationType: 'all',
//     apis: [
//     { type: 'get', require: true },
//     { type: 'post', require: true },
//     { type: 'put', require: true },
//     { type: 'delete', require: true },
//     { type: 'patch', require: true }
// ],
//     socket: true,
//     database: 'mongo',
//     swagger: { enabled: true, path: '/api-docs' },
//     docker: true
// }
const endPromptSession = () => {
    note(
        'This tool will now install dependencies, configure your project, and do other fancy things.',
        'Press Ctrl+C to cancel.'
    )

    outro('Thank you for using Node Initializer')
}
export const installScript = async (projectConfig: ProjectConfig) => {
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

    endPromptSession()
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
