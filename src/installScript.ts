import { ProjectConfig } from './interfaces'
import path from 'node:path'
import fs from 'fs/promises'
import { spinner } from '@clack/prompts'
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

export const install = async (projectConfig: ProjectConfig) => {
    console.log(projectConfig)
    const s = spinner()
    s.start('Creating project folder')
    await createProjectFolder(projectConfig.projectLocation)
    s.stop('Created project folder')

    s.start('Setting up project name')
    await setupProjectName(projectConfig.projectLocation, projectConfig.projectName)
    s.stop('Setup project name')
}

const createProjectFolder = async (projectLocation: string) => {
    const templateLocation = path.join(__dirname, '..', 'template')
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