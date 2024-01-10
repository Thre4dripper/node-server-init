import {
    confirm,
    intro,
    isCancel,
    log,
    multiselect,
    note,
    outro,
    select,
    text,
} from '@clack/prompts'
import { ApiType, Database, InstallationType, ProjectType } from './enums'
import { ProjectConfig } from './interfaces'
import path from 'node:path'

const startPromptSession = () => {
    intro('Welcome to Node Initializer CLI tool')

    note(
        'This tool will help you to setup backend project with express, mongoose, socket.io, swagger, docker and more.',
        'Press Ctrl+C to cancel.',
    )
}

export const initPrompts = async (restarted: boolean): Promise<ProjectConfig | undefined> => {
    //getting folder name from command line arguments
    let folderName
    if (process.argv.length <= 2) {
        log.error('No arguments provided --help for more info')
        return
    }

    if (process.argv[2] === '--help') {
        log.info('node-initializer <folder-name> (for specific folder)')
        log.info('node-initializer . (to use current folder)')
        return
    }

    folderName = process.argv[2]
    if (folderName === '.') {
        folderName = process.cwd()
    } else {
        folderName = path.join(process.cwd(), folderName)
    }

    //flow starts here
    if (!restarted) startPromptSession()

    const projectName = await text({
        message: 'What is your project name?',
        placeholder: 'my-project',
        initialValue: 'my-project',
        validate: (value) => {
            if (value.length < 3) {
                return 'Name must be at least 3 characters long'
            }
        },
    })

    if (isCancel(projectName)) {
        log.warning('Cancelled by user')
        return await startOver()
    }

    log.info('Use arrow keys to navigate. Press Enter to select.')

    // const projectType = await select({
    //     message: 'Pick a project type.',
    //     options: [
    //         { value: ProjectType.Typescript, label: 'TypeScript', hint: 'Recommended' },
    //         { value: ProjectType.Javascript, label: 'JavaScript' },
    //     ],
    // })
    //
    // if (isCancel(projectType)) {
    //     log.warning('Cancelled by user')
    //     return await startOver()
    // }

    const database = await select({
        message: 'Pick a database.',
        options: [
            { value: Database.Mongo, label: 'MongoDB', hint: 'Recommended for beginners' },
            { value: Database.Mysql, label: 'MySQL', hint: 'Recommended for production' },
            { value: Database.Postgres, label: 'PostgreSQL', hint: 'Recommended for production' },
            { value: Database.Sqlite, label: 'SQLite', hint: 'Recommended for testing' },
            { value: Database.Mssql, label: 'MSSQL', hint: 'Recommended for production' },
            { value: Database.MariaDB, label: 'MariaDB', hint: 'Recommended for production' },
            { value: Database.DB2, label: 'DB2', hint: 'Recommended for production' },
            { value: Database.Snowflake, label: 'Snowflake', hint: 'Recommended for production' },
            { value: Database.Oracle, label: 'Oracle', hint: 'Recommended for production' },
        ],
    })

    if (isCancel(database)) {
        log.warning('Cancelled by user')
        return await startOver()
    }

    const installationType = await select({
        message: 'Pick a installation type.',
        options: [
            { value: InstallationType.All, label: 'All', hint: 'Recommended' },
            { value: InstallationType.Custom, label: 'Custom', hint: 'Select what you want' },
        ],
    })

    if (isCancel(installationType)) {
        log.warning('Cancelled by user')
        return await startOver()
    }

    if (installationType === InstallationType.All) {
        return {
            projectLocation: folderName,
            projectName: projectName as string,
            projectType: ProjectType.Typescript,
            database: database as Database,
            installationType: installationType as InstallationType,
            apis: [
                { type: ApiType.GET, require: true },
                { type: ApiType.POST, require: true },
                { type: ApiType.PUT, require: true },
                { type: ApiType.DELETE, require: true },
                { type: ApiType.PATCH, require: true },
            ],
            socket: true,
            swagger: {
                enabled: true,
                path: '/api-docs',
            },
            docker: true,
        }
    }

    log.info(
        'Multiple options can be selected by pressing <space>. Press <a> to toggle all options.',
    )
    const apiTypes = await multiselect({
        message: 'Select API types. (At least one is required)',
        options: [
            { value: ApiType.GET, label: 'GET', hint: 'Get data from server' },
            { value: ApiType.POST, label: 'POST', hint: 'Create data on server' },
            { value: ApiType.PUT, label: 'PUT', hint: 'Update data on server' },
            { value: ApiType.DELETE, label: 'DELETE', hint: 'Remove data from server' },
            { value: ApiType.PATCH, label: 'PATCH', hint: 'Update data on server' },
        ],
        required: true,
    })

    if (isCancel(apiTypes)) {
        log.warning('Cancelled by user')
        return await startOver()
    }

    const socket = await confirm({
        message: 'Do you want to use socket?',
    })

    if (isCancel(socket)) {
        log.warning('Cancelled by user')
        return await startOver()
    }

    const swagger = await confirm({
        message: 'Do you want to use swagger?',
    })

    if (isCancel(swagger)) {
        log.warning('Cancelled by user')
        return await startOver()
    }

    const swaggerPath = swagger
        ? await text({
            message: 'What is your swagger path?',
            placeholder: '/swagger',
            initialValue: '/swagger',
            validate: (value) => {
                if (value[0] !== '/') {
                    return 'Path must start with /'
                }
                const regex = /^\/[a-zA-Z0-9-_]+$/
                if (!regex.test(value)) {
                    return 'Invalid path'
                }
            },
        })
        : undefined

    if (isCancel(swaggerPath)) {
        log.warning('Cancelled by user')
        return await startOver()
    }

    const docker = await confirm({
        message: 'Do you want to use docker?',
    })

    if (isCancel(docker)) {
        log.warning('Cancelled by user')
        return await startOver()
    }

    return {
        projectLocation: folderName,
        projectName: projectName as string,
        projectType: ProjectType.Typescript,
        database: database as Database,
        installationType: installationType as InstallationType,
        apis: Object.values(ApiType).map((apiType) => {
            return {
                type: apiType as ApiType,
                require: apiTypes.includes(apiType),
            }
        }),
        socket: socket as boolean,
        swagger: {
            enabled: swagger as boolean,
            path: swagger ? (swaggerPath as string) : undefined,
        },
        docker: docker as boolean,
    }
}

const startOver = async (): Promise<ProjectConfig | undefined> => {
    const shouldStartOver = await confirm({
        message: 'Do you want to start over?',
    })

    if (isCancel(shouldStartOver)) {
        log.warning('Exited from Node Initializer')
        return
    }

    if (shouldStartOver) {
        return await initPrompts(true)
    }

    log.warning('Exited from Node Initializer')
}
