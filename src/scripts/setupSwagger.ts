import fs from 'fs/promises'
import path from 'node:path'
import { SwaggerSetup } from '../prompts/interfaces'
import { ProjectType } from '../prompts/enums'

class SetupSwagger {
    public static async init(
        projectLocation: string,
        swagger: SwaggerSetup,
        projectType: ProjectType
    ) {
        if (swagger.enabled) {
            await this.setupSwaggerPath(projectLocation, swagger.path!, projectType)
        } else {
            await this.dependencies(projectLocation)
            await this.deleteSwaggerConfig(projectLocation, projectType)
            await this.removeFromExpressConfig(projectLocation, projectType)
            await this.removeFromMasterController(projectLocation, projectType)
        }
    }

    private static async setupSwaggerPath(
        projectLocation: string,
        swaggerPath: string,
        projectType: ProjectType
    ) {
        const expressConfigLocation = path.join(
            projectLocation,
            'src',
            'config',
            `expressConfig.${projectType}`
        )
        const expressConfigContents = await fs.readFile(expressConfigLocation, 'utf8')

        // change swagger-path
        const expressConfigContentsModified = expressConfigContents.replace(
            /\/api-docs/g,
            swaggerPath
        )

        await fs.writeFile(expressConfigLocation, expressConfigContentsModified)
    }

    private static async dependencies(projectLocation: string) {
        const packageJsonLocation = path.join(projectLocation, 'package.json')
        const packageJson = require(packageJsonLocation)
        delete packageJson.dependencies['swagger-ui-express']
        delete packageJson.devDependencies['@types/swagger-ui-express']
        await fs.writeFile(packageJsonLocation, JSON.stringify(packageJson, null, 2))
    }

    private static async deleteSwaggerConfig(projectLocation: string, projectType: ProjectType) {
        // remove swagger config
        const swaggerConfig = path.join(
            projectLocation,
            'src',
            'config',
            `swaggerConfig.${projectType}`
        )
        await fs.rm(swaggerConfig)

        // remove swagger.json
        const swaggerJson = path.join(projectLocation, 'swagger.json')
        await fs.rm(swaggerJson)
    }

    private static async removeFromExpressConfig(
        projectLocation: string,
        projectType: ProjectType
    ) {
        const expressConfigLocation = path.join(
            projectLocation,
            'src',
            'config',
            `expressConfig.${projectType}`
        )
        const expressConfigContents = await fs.readFile(expressConfigLocation, 'utf8')
        const expressConfigLines = expressConfigContents.split('\n')

        const linesToBeRemoved: number[] = []

        const swaggerImportStartIndex = expressConfigLines.findIndex((line) =>
            line.includes('start swagger import')
        )
        const swaggerImportEndIndex = expressConfigLines.findIndex((line) =>
            line.includes('end swagger import')
        )

        for (let i = swaggerImportStartIndex; i <= swaggerImportEndIndex; i++) {
            linesToBeRemoved.push(i)
        }

        const swaggerConfigStartIndex = expressConfigLines.findIndex((line) =>
            line.includes('start swagger config')
        )
        const swaggerConfigEndIndex = expressConfigLines.findIndex((line) =>
            line.includes('end swagger config')
        )

        for (let i = swaggerConfigStartIndex; i <= swaggerConfigEndIndex; i++) {
            linesToBeRemoved.push(i)
        }

        const swaggerConfigMiddlewareIndex = expressConfigLines.findIndex((line) =>
            line.includes('/api-docs')
        )

        linesToBeRemoved.push(swaggerConfigMiddlewareIndex)

        const filteredExpressConfigLines = expressConfigLines.filter(
            (_, index) => !linesToBeRemoved.includes(index)
        )
        const expressConfigModified = filteredExpressConfigLines.join('\n')
        await fs.writeFile(expressConfigLocation, expressConfigModified)
    }

    private static async removeFromMasterController(
        projectLocation: string,
        projectType: ProjectType
    ) {
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

        //remove swagger lines
        const swaggerImportLineIndex = masterControllerLines.findIndex((line) =>
            line.includes('SwaggerConfig')
        )
        linesToBeRemoved.push(swaggerImportLineIndex)

        // remove swagger usage
        masterControllerLines.forEach((line, index) => {
            if (line.includes('recordApi')) {
                linesToBeRemoved.push(index)
            }
        })

        const filteredMasterControllerLines = masterControllerLines.filter(
            (_, index) => !linesToBeRemoved.includes(index)
        )
        const masterControllerModified = filteredMasterControllerLines.join('\n')
        await fs.writeFile(masterControllerLocation, masterControllerModified)
    }
}

export default SetupSwagger
