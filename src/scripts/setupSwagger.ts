import fs from 'fs/promises'
import path from 'node:path'
import { SwaggerSetup } from '../prompts/interfaces'

class SetupSwagger {
    public static async init(projectLocation: string, swagger: SwaggerSetup) {
        if (swagger.enabled) {
            await this.setupSwaggerPath(projectLocation, swagger.path!)
        } else {
            await this.dependencies(projectLocation)
            await this.deleteSwaggerConfig(projectLocation)
            await this.removeFromExpressConfig(projectLocation)
            await this.removeFromMasterController(projectLocation)
        }
    }

    private static async setupSwaggerPath(projectLocation: string, swaggerPath: string) {
        const expressConfigLocation = path.join(projectLocation, 'src', 'config', 'expressConfig.ts')
        const expressConfigContents = await fs.readFile(expressConfigLocation, 'utf8')

        // change swagger-path
        const expressConfigContentsModified = expressConfigContents.replace(/\/api-docs/g, swaggerPath)

        await fs.writeFile(expressConfigLocation, expressConfigContentsModified)
    }

    private static async dependencies(projectLocation: string) {
        const packageJsonLocation = path.join(projectLocation, 'package.json')
        const packageJson = require(packageJsonLocation)
        delete packageJson.dependencies['swagger-ui-express']
        delete packageJson.devDependencies['@types/swagger-ui-express']
        await fs.writeFile(packageJsonLocation, JSON.stringify(packageJson, null, 2))
    }

    private static async deleteSwaggerConfig(projectLocation: string) {
        const swaggerConfig = path.join(projectLocation, 'src', 'config', 'swaggerConfig.ts')
        await fs.rm(swaggerConfig)
    }

    private static async removeFromExpressConfig(projectLocation: string) {
        const expressConfigLocation = path.join(projectLocation, 'src', 'config', 'expressConfig.ts')
        const expressConfigContents = await fs.readFile(expressConfigLocation, 'utf8')
        const expressConfigLines = expressConfigContents.split('\n')

        const linesToBeRemoved: number[] = []

        const swaggerImportStartIndex = expressConfigLines.findIndex((line) => line.includes('start swagger import'))
        const swaggerImportEndIndex = expressConfigLines.findIndex((line) => line.includes('end swagger import'))

        for (let i = swaggerImportStartIndex; i <= swaggerImportEndIndex; i++) {
            linesToBeRemoved.push(i)
        }

        const swaggerConfigStartIndex = expressConfigLines.findIndex((line) => line.includes('start swagger config'))
        const swaggerConfigEndIndex = expressConfigLines.findIndex((line) => line.includes('end swagger config'))

        for (let i = swaggerConfigStartIndex; i <= swaggerConfigEndIndex; i++) {
            linesToBeRemoved.push(i)
        }

        const swaggerConfigMiddlewareIndex = expressConfigLines.findIndex((line) => line.includes('/api-docs'))

        linesToBeRemoved.push(swaggerConfigMiddlewareIndex)

        const filteredExpressConfigLines = expressConfigLines.filter((_, index) => !linesToBeRemoved.includes(index))
        const expressConfigModified = filteredExpressConfigLines.join('\n')
        await fs.writeFile(expressConfigLocation, expressConfigModified)
    }

    private static async removeFromMasterController(projectLocation: string) {
        const masterControllerLocation = path.join(projectLocation, 'src', 'app', 'utils', 'masterController.ts')
        const masterControllerContents = await fs.readFile(masterControllerLocation, 'utf8')

        const masterControllerLines = masterControllerContents.split('\n')

        const linesToBeRemoved: number[] = []

        //remove swagger lines
        const swaggerImportLineIndex = masterControllerLines.findIndex((line) => line.includes('SwaggerConfig'))
        linesToBeRemoved.push(swaggerImportLineIndex)

        // remove swagger usage
        masterControllerLines.forEach((line, index) => {
            if (line.includes('recordApi')) {
                linesToBeRemoved.push(index)
            }
        })

        const filteredMasterControllerLines = masterControllerLines.filter((_, index) => !linesToBeRemoved.includes(index))
        const masterControllerModified = filteredMasterControllerLines.join('\n')
        await fs.writeFile(masterControllerLocation, masterControllerModified)
    }
}

export default SetupSwagger