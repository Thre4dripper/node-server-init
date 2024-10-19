import fs from 'fs/promises';
import path from 'node:path';
import { ProjectType } from '../prompts/enums';

class SetupSocket {
    public static async init(projectLocation: string, socket: boolean, projectType: ProjectType) {
        // if socket is required then no need to delete socket files
        if (socket) return;

        await this.dependencies(projectLocation);
        await this.deleteSocketConfig(projectLocation, projectType);
        await this.removeFromServer(projectLocation, projectType);
        await this.removeFromMasterController(projectLocation, projectType);
        await this.removeFromRouter(projectLocation, projectType);
    }

    private static async dependencies(projectLocation: string) {
        const packageJsonLocation = path.join(projectLocation, 'package.json');
        const packageJson = require(packageJsonLocation);
        delete packageJson.dependencies['socket.io'];
        await fs.writeFile(packageJsonLocation, JSON.stringify(packageJson, null, 2));
    }

    private static async deleteSocketConfig(projectLocation: string, projectType: ProjectType) {
        const socketConfig = path.join(
            projectLocation,
            'src',
            'config',
            `socketConfig.${projectType}`
        );
        await fs.rm(socketConfig);
    }

    private static async removeFromServer(projectLocation: string, projectType: ProjectType) {
        const serverLocation = path.join(projectLocation, 'src', `server.${projectType}`);
        const serverContents = await fs.readFile(serverLocation, 'utf8');
        const serverContentLines = serverContents.split('\n');

        const linesToBeRemoved: number[] = [];

        const socketImportLineIndex = serverContentLines.findIndex((line) =>
            line.includes('SocketConfig')
        );

        linesToBeRemoved.push(socketImportLineIndex);

        const socketConfigStartIndex = serverContentLines.findIndex((line) =>
            line.includes('Initialize Socket.IO')
        );
        const socketConfigEndIndex = serverContentLines.findIndex(
            (line, index) => line.includes('End Initialize') && index > socketConfigStartIndex
        );

        for (let i = socketConfigStartIndex; i <= socketConfigEndIndex; i++) {
            linesToBeRemoved.push(i);
        }

        const filteredServerLines = serverContentLines.filter(
            (_, index) => !linesToBeRemoved.includes(index)
        );
        const serverModified = filteredServerLines.join('\n');
        await fs.writeFile(serverLocation, serverModified);
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
        );
        const masterControllerContents = await fs.readFile(masterControllerLocation, 'utf8');

        const masterControllerLines = masterControllerContents.split('\n');

        const linesToBeRemoved: number[] = [];

        //remove socket import line
        const socketImportLineIndex = masterControllerLines.findIndex((line) =>
            line.includes('socket.io')
        );

        linesToBeRemoved.push(socketImportLineIndex);

        //remove interface
        const socketInterfaceStartIndex = masterControllerLines.findIndex((line) =>
            line.includes('ISocketClient')
        );
        const socketInterfaceEndIndex = masterControllerLines.findIndex(
            (line, index) => line.includes('}') && index > socketInterfaceStartIndex
        );

        for (let i = socketInterfaceStartIndex; i <= socketInterfaceEndIndex; i++) {
            linesToBeRemoved.push(i);
        }

        //remove socket request snippet
        const socketRequestSnippetStartIndex = masterControllerLines.findIndex((line) =>
            line.includes('start socket requests snippet')
        );
        const socketRequestSnippetEndIndex = masterControllerLines.findIndex((line) =>
            line.includes('end socket requests snippet')
        );

        for (let i = socketRequestSnippetStartIndex; i <= socketRequestSnippetEndIndex; i++) {
            linesToBeRemoved.push(i);
        }

        //removing socket controller
        const socketControllerDocStartIndex = masterControllerLines.findIndex((line) =>
            line.includes('MasterController.socketController')
        );
        const socketControllerStartIndex = masterControllerLines.findIndex((line) =>
            line.includes('socketController(')
        );
        const socketControllerEndIndex = masterControllerLines.findIndex(
            (line, index) => line.includes('}') && index > socketControllerStartIndex
        );

        for (let i = socketControllerDocStartIndex - 1; i <= socketControllerEndIndex; i++) {
            linesToBeRemoved.push(i);
        }

        //removing socketIO from master controller
        const socketIODocStartIndex = masterControllerLines.findIndex((line) =>
            line.includes('@method MasterController.socketIO')
        );
        const socketIOStartIndex = masterControllerLines.findIndex((line) =>
            line.includes('static socketIO(')
        );
        const socketIOEndIndex =
            masterControllerLines.findIndex(
                (line, index) => line.includes('}') && index > socketIOStartIndex
            ) + 1;

        for (let i = socketIODocStartIndex - 1; i <= socketIOEndIndex; i++) {
            linesToBeRemoved.push(i);
        }

        const filteredMasterControllerLines = masterControllerLines.filter(
            (_, index) => !linesToBeRemoved.includes(index)
        );
        const masterControllerModified = filteredMasterControllerLines.join('\n');
        await fs.writeFile(masterControllerLocation, masterControllerModified);
    }

    private static async removeFromRouter(projectLocation: string, projectType: ProjectType) {
        const routerLocation = path.join(
            projectLocation,
            'src',
            'app',
            'routes',
            `user.routes.${projectType}`
        );
        const routerContents = await fs.readFile(routerLocation, 'utf8');

        const routerLines = routerContents.split('\n');

        const linesToBeRemoved: number[] = [];

        const socketImportLineIndex = routerLines.findIndex((line) => line.includes('socketIO'));

        linesToBeRemoved.push(socketImportLineIndex);

        const filteredRouterLines = routerLines.filter(
            (_, index) => !linesToBeRemoved.includes(index)
        );
        const routerModified = filteredRouterLines.join('\n');
        await fs.writeFile(routerLocation, routerModified);
    }
}

export default SetupSocket;
