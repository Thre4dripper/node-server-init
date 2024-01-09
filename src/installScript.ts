import path from 'node:path'
import fs from 'fs/promises'
import shell from 'shelljs'
import { spinner } from '@clack/prompts'
import { ProjectConfig } from './interfaces'
import { Database, ProjectType } from './enums'
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
    // s.stop('Created project folder')

    // s.start('Setting up project name')
    await setupProjectName(projectConfig.projectLocation, projectConfig.projectName)
    // s.stop('Setup project name')

    // s.start('Setting up project database')
    await setupProjectDatabase(projectConfig.projectLocation, projectConfig.database)
    s.stop('Setup project database')
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

const setupProjectDatabase = async (projectLocation: string, database: Database) => {
    if (database === Database.Mongo) {
        await setupMongo(projectLocation)
    }
}

const setupMongo = async (projectLocation: string) => {
    // create .env file from .env.sample
    const envSampleLocation = path.join(projectLocation, '.env.sample')
    const envSampleContents = await fs.readFile(envSampleLocation, 'utf8')

    let envContents = envSampleContents.replace('DB_DIALECT=mongodb', 'DB_DIALECT=mongodb')
    envContents = envContents.replace('MONGO_URI=mongodb://127.0.0.1:27017/Test', 'MONGO_URI=mongodb://127.0.0.1:27017/YourDatabaseName')

    // remove sequelize related env variables
    const sequelizeEnvVariables = ['#', 'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASS']
    const envLines = envContents.split('\n')
    const filteredEnvLines = envLines.filter(line => !sequelizeEnvVariables.some(variable => line.startsWith(variable)))
    envContents = filteredEnvLines.join('\n')


    const envLocation = path.join(projectLocation, '.env')
    await fs.writeFile(envLocation, envContents)

    //install mongoose
    shell.cd(projectLocation)
    // shell.exec('npm i mongoose')

    //changes in repository
    const sequelizeRepo = path.join(projectLocation, 'src', 'app', 'apis', 'user', 'repositories', 'sequelize.user.repository.ts')
    await fs.rm(sequelizeRepo)

    const mongoRepo = path.join(projectLocation, 'src', 'app', 'apis', 'user', 'repositories', 'mongoose.user.repository.ts')
    const mongoRepoContents = await fs.readFile(mongoRepo, 'utf8')
    const mongoRepoContentsModified = mongoRepoContents.replace('import User from \'../../../models/mongoose.user.model\'', 'import User from \'../../../models/user.model\'')
    await fs.writeFile(mongoRepo, mongoRepoContentsModified)
    await fs.rename(mongoRepo, path.join(projectLocation, 'src', 'app', 'apis', 'user', 'repositories', 'user.repository.ts'))

    //changes in service
    const service = path.join(projectLocation, 'src', 'app', 'apis', 'user', 'services', 'user.service.ts')
    const serviceContents = await fs.readFile(service, 'utf8')
    const serviceContentsModified = serviceContents.replace('import userRepository from \'../repositories/sequelize.user.repository\'', 'import userRepository from \'../repositories/user.repository\'')
    await fs.writeFile(service, serviceContentsModified)

    //changes in models folder
    const sequelizeModel = path.join(projectLocation, 'src', 'app', 'models', 'sequelize.user.model.ts')
    await fs.rm(sequelizeModel)

    const mongoModel = path.join(projectLocation, 'src', 'app', 'models', 'mongoose.user.model.ts')
    await fs.rename(mongoModel, path.join(projectLocation, 'src', 'app', 'models', 'user.model.ts'))

    //remove sequelize config
    const sequelizeConfig = path.join(projectLocation, 'src', 'config', 'sequelizeConfig.ts')
    await fs.rm(sequelizeConfig)

    //edit in server.ts
    const server = path.join(projectLocation, 'src', 'server.ts')
    const serverContents = await fs.readFile(server, 'utf8')

    const serverContentLines = serverContents.split('\n')
    const linesToBeRemoved = [5, 19, 20, 21, 22, 25, 26, 27, 28, 29, 30, 31, 32, 39]

    const filteredServerContentLines = serverContentLines.filter((_, index) => !linesToBeRemoved.includes(index + 1))
    const serverContentsModified = filteredServerContentLines.join('\n')

    await fs.writeFile(server, serverContentsModified)
}