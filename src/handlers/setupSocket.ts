import fs from 'fs/promises';
import path from 'node:path';
import { ProjectType } from '../prompts/enums';
import { removeAllMarkedBlocks, pruneUnusedLogger } from './markerUtils';

class SetupSocket {
    public static async init(projectLocation: string, socket: boolean, projectType: ProjectType) {
        // if socket is required then no need to delete socket files
        if (socket) return;

        await this.dependencies(projectLocation);
        await this.deleteSocketConfig(projectLocation, projectType);
        await this.removeFromServer(projectLocation, projectType);
        await this.removeFromMasterController(projectLocation, projectType);
        await this.removeFromHandlers(projectLocation, projectType);
        await this.removeSocketFilesAndFolders(projectLocation);
    }

    private static async dependencies(projectLocation: string) {
        const packageJsonLocation = path.join(projectLocation, 'package.json');
        const packageJson = JSON.parse(await fs.readFile(packageJsonLocation, 'utf8'));
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

        //removing socket controller method (marker-delimited for resilience)
        const socketControllerMarkerStart = masterControllerLines.findIndex((line) =>
            line.includes('start socket controller method')
        );
        const socketControllerMarkerEnd = masterControllerLines.findIndex(
            (line, index) =>
                line.includes('end socket controller method') &&
                index > socketControllerMarkerStart
        );

        if (socketControllerMarkerStart !== -1 && socketControllerMarkerEnd !== -1) {
            for (let i = socketControllerMarkerStart; i <= socketControllerMarkerEnd; i++) {
                linesToBeRemoved.push(i);
            }
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


    /**
     * Strip socket-only code (imports, socket error-handler branches/exports)
     * from the shared error handlers, then drop the shared logger binding if it
     * is no longer referenced. Blocks are delimited by `// start socket` ...
     * `// end socket`.
     */
    private static async removeFromHandlers(projectLocation: string, projectType: ProjectType) {
        const targets = [
            path.join(projectLocation, 'src', 'app', 'handlers', `CustomErrorHandler.${projectType}`),
            path.join(projectLocation, 'src', 'app', 'handlers', `JoiErrorHandler.${projectType}`),
        ];

        await Promise.all(
            targets.map(async (target) => {
                const contents = await fs.readFile(target, 'utf8');
                const stripped = removeAllMarkedBlocks(contents, 'start socket', 'end socket');
                await fs.writeFile(target, pruneUnusedLogger(stripped));
            })
        );
    }

    private static async removeSocketFilesAndFolders(projectLocation: string) {
        const socketFolder = path.join(projectLocation, 'src', 'app', 'sockets');
        await fs.rm(socketFolder, { recursive: true });
    }
}

export default SetupSocket;
