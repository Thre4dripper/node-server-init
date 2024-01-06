import { ProjectConfig } from './interfaces'
import path from 'node:path'
import fs from 'fs/promises'
import { spinner } from '@clack/prompts'
// {
//     projectLocation: 'C:\\Users\\ijlal\\Desktop\\New folder\\test',
//         projectName: 'my-project',
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

export const install = async (projectConfig: ProjectConfig) => {
    const s = spinner()
    s.start('Creating project folder')
    await createProjectFolder(projectConfig.projectLocation)
    s.stop('Created project folder')
}

const createProjectFolder = async (projectLocation: string) => {
    const templateLocation = path.join(__dirname, '..', 'template')
    const projectFolder = path.join(projectLocation)
    await fs.cp(templateLocation, projectFolder, { recursive: true })
}