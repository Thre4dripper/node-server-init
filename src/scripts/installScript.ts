import path from 'node:path';
import fs from 'fs/promises';
import { spawn } from 'node:child_process';
import { outro, spinner } from '@clack/prompts';
import { Apis, ProjectConfig, SwaggerSetup } from '../prompts/interfaces';
import { ApiType, Database, PackageManager, ProjectType } from '../prompts/enums';
import SetupMongoose from '../handlers/setupMongoose';
import SetupSequelize from '../handlers/setupSequelize';
import SetupSocket from '../handlers/setupSocket';
import SetupSwagger from '../handlers/setupSwagger';
import SetupCron from '../handlers/setupCron';
import SetupDocker from '../handlers/setupDocker';
import SetupGrpc from '../handlers/setupGrpc';
import SetupRedis from '../handlers/setupRedis';
import SetupReadme from '../handlers/setupReadme';

export const installScript = async (projectConfig: ProjectConfig) => {
    try {
        const s = spinner();
        s.start('Creating project folder');
        await createProjectFolder(projectConfig.projectLocation, projectConfig.projectType);
        await setupProjectName(projectConfig.projectLocation, projectConfig.projectName);
        await setupProjectType(
            projectConfig.projectLocation,
            projectConfig.projectType,
            projectConfig.packageManager
        );
        s.stop('Created project folder');

        s.start('Integrating database');
        await setupProjectDatabase(
            projectConfig.projectLocation,
            projectConfig.database,
            projectConfig.projectType
        );
        s.stop('Integrated database');

        s.start('Setting up api controllers');
        await setupApis(
            projectConfig.projectLocation,
            projectConfig.apis,
            projectConfig.projectType
        );
        s.stop('Api controllers setup complete');

        s.start('Configuring gRPC');
        await setupGrpc(projectConfig.projectLocation, projectConfig.grpc, projectConfig.projectType);
        s.stop('Configured gRPC');

        s.start('Configuring Redis');
        await setupRedis(projectConfig.projectLocation, projectConfig.redis, projectConfig.projectType);
        s.stop('Configured Redis');

        // When neither gRPC nor Redis is selected, the graceful-shutdown block has no
        // work left to do, so remove it entirely (avoids a dangling empty try/catch).
        if (!projectConfig.grpc && !projectConfig.redis) {
            await removeGracefulShutdown(
                projectConfig.projectLocation,
                projectConfig.projectType
            );
        }

        s.start('Configuring socket');
        await setupSocket(
            projectConfig.projectLocation,
            projectConfig.socket,
            projectConfig.projectType
        );
        s.stop('Configured socket');

        s.start('Configuring cron');
        await setupCron(
            projectConfig.projectLocation,
            projectConfig.cron,
            projectConfig.projectType
        );
        s.stop('Configured cron');

        await cleanupServerPathImport(
            projectConfig.projectLocation,
            projectConfig.projectType,
            projectConfig.socket,
            projectConfig.cron
        );

        s.start('Configuring swagger');
        await setupSwagger(
            projectConfig.projectLocation,
            projectConfig.swagger,
            projectConfig.projectType
        );
        s.stop('Configured swagger');

        s.start('Configuring docker');
        await setupDocker(projectConfig.projectLocation, projectConfig.docker);
        s.stop('Configured docker');

        s.start('Configuring package manager');
        await setupPackageManager(projectConfig.projectLocation, projectConfig.packageManager);
        s.stop('Configured package manager');

        await setupReadme(projectConfig);

        s.start('Installing dependencies');
        await installDependencies(projectConfig.projectLocation, projectConfig.packageManager);
        s.stop('Installed dependencies');

        outro('Project setup complete.');
    } catch (err) {
        console.log(err);
    }
};

const createProjectFolder = async (projectLocation: string, projectType: ProjectType) => {
    const templateLocation = path.join(__dirname, '..', '..', `template-${projectType}`);
    const projectFolder = path.join(projectLocation);
    await fs.cp(templateLocation, projectFolder, { recursive: true });
};

const removeGracefulShutdown = async (projectLocation: string, projectType: ProjectType) => {
    const serverLocation = path.join(projectLocation, 'src', `server.${projectType}`);
    const serverContents = await fs.readFile(serverLocation, 'utf8');
    const serverLines = serverContents.split('\n');

    const startIndex = serverLines.findIndex((line) =>
        line.includes('start graceful shutdown')
    );
    const endIndex = serverLines.findIndex(
        (line, index) => line.includes('end graceful shutdown') && index > startIndex
    );

    if (startIndex === -1 || endIndex === -1) return;

    const linesToRemove: number[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
        linesToRemove.push(i);
    }

    const filteredServerLines = serverLines.filter((_, index) => !linesToRemove.includes(index));
    await fs.writeFile(serverLocation, filteredServerLines.join('\n'));
};

const setupProjectName = async (projectLocation: string, projectName: string) => {
    const packageJsonLocation = path.join(projectLocation, 'package.json');
    const packageJson = await fs.readFile(packageJsonLocation, 'utf8');
    const packageJsonObj = JSON.parse(packageJson);
    packageJsonObj.name = projectName;
    await fs.writeFile(packageJsonLocation, JSON.stringify(packageJsonObj, null, 2));
};

const setupPackageManager = async (projectLocation: string, packageManager: PackageManager) => {
    const packageJsonLocation = path.join(projectLocation, 'package.json');
    const packageJson = await fs.readFile(packageJsonLocation, 'utf8');
    const packageJsonObj = JSON.parse(packageJson) as {
        packageManager: string;
        scripts: Record<string, string>;
    };
    const packageManagerVersion = await getPackageManagerVersion(packageManager);
    packageJsonObj.packageManager = `${packageManager}@${packageManagerVersion}`;

    if (packageManager !== PackageManager.Pnpm) {
        const scriptEntries = Object.entries(packageJsonObj.scripts || {});
        for (const [scriptName, scriptValue] of scriptEntries) {
            packageJsonObj.scripts[scriptName] = rewritePnpmScriptPrefix(scriptValue, packageManager);
        }
    }

    await fs.writeFile(packageJsonLocation, JSON.stringify(packageJsonObj, null, 2));

    if (packageManager !== PackageManager.Pnpm) {
        await Promise.allSettled([
            fs.rm(path.join(projectLocation, 'pnpm-lock.yaml')),
            fs.rm(path.join(projectLocation, 'pnpm-workspace.yaml')),
        ]);
    }
};

const getPackageManagerVersion = async (packageManager: PackageManager) => {
    const version = await runCommand(packageManager, ['--version'], process.cwd(), false);
    return version.trim();
};

const installDependencies = async (projectLocation: string, packageManager: PackageManager) => {
    await runCommand(packageManager, ['install'], projectLocation, true);
};

const runCommand = async (
    command: PackageManager,
    args: string[],
    cwd: string,
    inheritOutput: boolean
) => {
    return new Promise<string>((resolve, reject) => {
        const child = spawn(command, args, {
            cwd,
            shell: false,
            stdio: inheritOutput ? 'inherit' : ['ignore', 'pipe', 'pipe'],
        });

        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', (chunk) => {
            stdout += chunk.toString();
        });

        child.stderr?.on('data', (chunk) => {
            stderr += chunk.toString();
        });

        child.on('error', (error) => {
            reject(error);
        });

        child.on('close', (code) => {
            if (code === 0) {
                resolve(stdout);
                return;
            }

            reject(
                new Error(
                    `${command} ${args.join(' ')} failed with exit code ${code}.${
                        stderr ? `\n${stderr.trim()}` : ''
                    }`
                )
            );
        });
    });
};

const rewritePnpmScriptPrefix = (script: string, packageManager: PackageManager) => {
    if (packageManager === PackageManager.Pnpm) return script;

    const replacement = packageManager === PackageManager.Npm ? 'npm run $1' : 'yarn $1';
    return script.replace(/\bpnpm\s+([a-zA-Z0-9:_-]+)/g, replacement);
};

const setupProjectType = async (
    projectLocation: string,
    projectType: ProjectType,
    packageManager: PackageManager
) => {
    const packageJsonLocation = path.join(projectLocation, 'package.json');
    const packageJson = await fs.readFile(packageJsonLocation, 'utf8');
    const packageJsonObj = JSON.parse(packageJson) as {
        scripts: { [key: string]: string };
        devDependencies: { [key: string]: string };
    };

    const nodemonConfigLocation = path.join(projectLocation, 'nodemon.json');
    const nodemonConfig = await fs.readFile(nodemonConfigLocation, 'utf8');
    const nodemonConfigObj = JSON.parse(nodemonConfig);
    const normalizeSrcPaths = (scriptValue: string) =>
        scriptValue.replace(/src-typescript/g, 'src').replace(/src-javascript/g, 'src');
    // The template dev scripts reference suffixed siblings (prettier-ts, nodemon-ts.json)
    // that get renamed to their canonical names during scaffolding; remap them too.
    const normalizeScript = (scriptValue: string) =>
        normalizeSrcPaths(scriptValue)
            .replace(/\bprettier-ts\b/g, 'prettier')
            .replace(/\bprettier-js\b/g, 'prettier')
            .replace(/nodemon-ts\.json/g, 'nodemon.json')
            .replace(/nodemon-js\.json/g, 'nodemon.json')
            .replace(/nodemon\s+src\/server\.(ts|js)\s+--config/g, 'nodemon --config');

    if (projectType === ProjectType.Typescript) {
        packageJsonObj.scripts.start = normalizeScript(packageJsonObj.scripts['start-ts']);
        packageJsonObj.scripts.dev = normalizeScript(packageJsonObj.scripts['dev-ts']);
        packageJsonObj.scripts.build = normalizeScript(packageJsonObj.scripts.build).replace(
            /proto:build-ts/g,
            'proto:build'
        );
        packageJsonObj.scripts.preview = normalizeScript(packageJsonObj.scripts.preview);
        packageJsonObj.scripts.prettier = normalizeScript(packageJsonObj.scripts['prettier-ts']);
        packageJsonObj.scripts['proto:build'] = normalizeScript(
            packageJsonObj.scripts['proto:build-ts'] || packageJsonObj.scripts['proto:build']
        );
        packageJsonObj.scripts.postinstall = normalizeScript(
            packageJsonObj.scripts['postinstall-ts'] || packageJsonObj.scripts.postinstall
        ).replace(/proto:build-ts/g, 'proto:build');

        delete packageJsonObj.scripts['start-ts'];
        delete packageJsonObj.scripts['dev-ts'];
        delete packageJsonObj.scripts['start-js'];
        delete packageJsonObj.scripts['dev-js'];
        delete packageJsonObj.scripts['prettier-ts'];
        delete packageJsonObj.scripts['prettier-js'];
        delete packageJsonObj.scripts['proto:build-ts'];
        delete packageJsonObj.scripts['proto:build-js'];
        delete packageJsonObj.scripts['postinstall-ts'];
        delete packageJsonObj.scripts['postinstall-js'];

        //nodemon-ts.json file
        const nodemonTsConfig = path.join(projectLocation, 'nodemon-ts.json');
        const nodemonTsConfigContents = await fs.readFile(nodemonTsConfig, 'utf8');
        const nodemonTsConfigObj = JSON.parse(nodemonTsConfigContents);

        nodemonConfigObj.exec = rewritePnpmScriptPrefix(nodemonTsConfigObj.exec, packageManager);
    } else {
        packageJsonObj.scripts.start = normalizeScript(packageJsonObj.scripts['start-js']);
        packageJsonObj.scripts.dev = normalizeScript(packageJsonObj.scripts['dev-js']);
        packageJsonObj.scripts.prettier = normalizeScript(packageJsonObj.scripts['prettier-js']);
        packageJsonObj.scripts['proto:build'] = normalizeScript(
            packageJsonObj.scripts['proto:build-js'] || packageJsonObj.scripts['proto:build']
        );
        packageJsonObj.scripts.postinstall = normalizeScript(
            packageJsonObj.scripts['postinstall-js'] || packageJsonObj.scripts.postinstall
        ).replace(/proto:build-js/g, 'proto:build');

        delete packageJsonObj.scripts['start-ts'];
        delete packageJsonObj.scripts['dev-ts'];
        delete packageJsonObj.scripts['start-js'];
        delete packageJsonObj.scripts['dev-js'];
        delete packageJsonObj.scripts.preview;
        delete packageJsonObj.scripts.build;
        delete packageJsonObj.scripts['prettier-ts'];
        delete packageJsonObj.scripts['prettier-js'];
        delete packageJsonObj.scripts['proto:build-ts'];
        delete packageJsonObj.scripts['proto:build-js'];
        delete packageJsonObj.scripts['postinstall-ts'];
        delete packageJsonObj.scripts['postinstall-js'];

        // remove typescript dependencies
        delete packageJsonObj.devDependencies['@types/bcrypt'];
        delete packageJsonObj.devDependencies['@types/cors'];
        delete packageJsonObj.devDependencies['@types/express'];
        delete packageJsonObj.devDependencies['@types/jsonwebtoken'];
        delete packageJsonObj.devDependencies['@types/morgan'];
        delete packageJsonObj.devDependencies['@types/node'];
        delete packageJsonObj.devDependencies['@types/swagger-ui-express'];
        delete packageJsonObj.devDependencies['copyfiles'];
        delete packageJsonObj.devDependencies['ts-node'];

        // nodemon-js.json file
        const nodemonJsConfig = path.join(projectLocation, 'nodemon-js.json');
        const nodemonJsConfigContents = await fs.readFile(nodemonJsConfig, 'utf8');
        const nodemonJsConfigObj = JSON.parse(nodemonJsConfigContents);

        nodemonConfigObj.exec = rewritePnpmScriptPrefix(
            nodemonJsConfigObj.exec.replace('-javascript', ''),
            packageManager
        );
    }

    nodemonConfigObj.execArgs = [];

    const protoGenScriptLocation = path.join(projectLocation, 'scripts', 'proto-gen.sh');
    const protoGenScriptContents = await fs.readFile(protoGenScriptLocation, 'utf8');
    const protoGenScriptModified = protoGenScriptContents
        .replace(/src-typescript\/proto/g, 'src/proto')
        .replace(/src-javascript\/proto/g, 'src/proto');

    //save changes and delete nodemon-ts.json and nodemon-js.json
    await Promise.all([
        fs.writeFile(packageJsonLocation, JSON.stringify(packageJsonObj, null, 2)),
        fs.writeFile(nodemonConfigLocation, JSON.stringify(nodemonConfigObj, null, 2)),
        fs.writeFile(protoGenScriptLocation, protoGenScriptModified),
        fs.rm(path.join(projectLocation, 'nodemon-ts.json')),
        fs.rm(path.join(projectLocation, 'nodemon-js.json')),
    ]);
};

const setupProjectDatabase = async (
    projectLocation: string,
    database: Database,
    projectType: ProjectType
) => {
    if (database === Database.Mongo) {
        await SetupMongoose.init(projectLocation, projectType);
    } else {
        await SetupSequelize.init(projectLocation, database, projectType);
    }
};

const setupApis = async (projectLocation: string, apis: Apis[], projectType: ProjectType) => {
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

    //removing api controllers from master controller
    apis.forEach((api) => {
        if (!api.require) {
            const apiDocStartLine = masterControllerLines.findIndex((line) =>
                line.includes(`${api.type.toUpperCase()}`)
            );
            const apiStartLine = masterControllerLines.findIndex((line) =>
                line.includes(`static ${api.type}(`)
            );
            const apiEndLine = masterControllerLines.findIndex(
                (line, index) => line.includes('}') && index > apiStartLine
            );

            for (let i = apiDocStartLine - 2; i <= apiEndLine; i++) {
                linesToBeRemoved.push(i);
            }
        }
    });

    const filteredMasterControllerLines = masterControllerLines.filter(
        (_, index) => !linesToBeRemoved.includes(index)
    );

    const masterControllerModified = filteredMasterControllerLines.join('\n');
    await fs.writeFile(masterControllerLocation, masterControllerModified);

    //changes in routes
    const routesLocation = path.join(
        projectLocation,
        'src',
        'app',
        'routes',
        `user.routes.${projectType}`
    );
    const routesContents = await fs.readFile(routesLocation, 'utf8');

    const availableMethods = apis.filter((api) => api.require).map((api) => api.type);

    // prefer POST method if available
    const availableMethod = availableMethods.includes(ApiType.POST)
        ? ApiType.POST
        : availableMethods[0];

    const routesModified = routesContents.replace(
        /(get|post|put|delete|patch)\(/g,
        `${availableMethod}(`
    );
    await fs.writeFile(routesLocation, routesModified);
};

const setupGrpc = async (projectLocation: string, grpc: boolean, projectType: ProjectType) => {
    await SetupGrpc.init(projectLocation, grpc, projectType);
};
const setupRedis = async (projectLocation: string, redis: boolean, projectType: ProjectType) => {
    await SetupRedis.init(projectLocation, redis, projectType);
};

const setupSocket = async (projectLocation: string, socket: boolean, projectType: ProjectType) => {
    await SetupSocket.init(projectLocation, socket, projectType);
};

const setupCron = async (projectLocation: string, cron: boolean, projectType: ProjectType) => {
    await SetupCron.init(projectLocation, cron, projectType);
};

const cleanupServerPathImport = async (
    projectLocation: string,
    projectType: ProjectType,
    socket: boolean,
    cron: boolean
) => {
    // `path` is needed by socket/cron module loading. If both features are off,
    // remove the import to avoid unused-import lint/type noise.
    if (socket || cron) return;

    const serverLocation = path.join(projectLocation, 'src', `server.${projectType}`);
    const serverContents = await fs.readFile(serverLocation, 'utf8');
    const serverModified = serverContents
        .split('\n')
        .filter((line) => !line.includes("from 'node:path'"))
        .join('\n');

    await fs.writeFile(serverLocation, serverModified);
};

const setupSwagger = async (
    projectLocation: string,
    swagger: SwaggerSetup,
    projectType: ProjectType
) => {
    await SetupSwagger.init(projectLocation, swagger, projectType);
};

const setupDocker = async (projectLocation: string, docker: boolean) => {
    await SetupDocker.init(projectLocation, docker);
};

const setupReadme = async (projectConfig: ProjectConfig) => {
    await SetupReadme.init(projectConfig);
};
