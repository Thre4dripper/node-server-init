import { cancel, confirm, intro, isCancel, log, multiselect, note, select, text } from "@clack/prompts";
import { ApiType, Database, InstallationType, ProjectType } from "./enums";
import { Apis, ProjectConfig } from "./interfaces";

export const initPrompts = async (): Promise<ProjectConfig | undefined> => {
    intro("Welcome to EMC CLI tool");

    note(
        "This tool will help you to setup backend project with express, mongoose, socket.io, swagger, docker and more.",
        "Press Ctrl+C to cancel."
    );

    const projectName = await text({
        message: "What is your project name?",
        placeholder: "my-project",
        initialValue: "my-project",
        validate: (value) => {
            if (value.length < 3) {
                return "Name must be at least 3 characters long";
            }
        },
    });

    if (isCancel(projectName)) {
        cancel("Cancelled by user");
        return await startOver();
    }

    log.info("Use arrow keys to navigate. Press Enter to select.");

    const installationType = await select({
        message: "Pick a installation type.",
        options: [
            { value: InstallationType.All, label: "All", hint: "Recommended" },
            { value: InstallationType.Custom, label: "Custom", hint: "Select what you want" },
        ],
    });

    if (isCancel(installationType)) {
        cancel("Cancelled by user");
        return await startOver();
    }


    if (installationType === InstallationType.All) {
        return {
            projectName: projectName as string,
            installationType: installationType as InstallationType,
            projectType: ProjectType.Typescript,
            apis: [
                { type: ApiType.GET, require: true },
                { type: ApiType.POST, require: true },
                { type: ApiType.PUT, require: true },
                { type: ApiType.DELETE, require: true },
                { type: ApiType.PATCH, require: true },
            ],
            socket: true,
            database: Database.Mongo,
            swagger: {
                enabled: true,
                path: "/api-docs"
            },
            docker: true
        }
    }

    const projectType = await select({
        message: "Pick a project type.",
        options: [
            { value: ProjectType.Typescript, label: "TypeScript", hint: "Recommended" },
            { value: ProjectType.Javascript, label: "JavaScript" },
        ],
    });

    if (isCancel(projectType)) {
        cancel("Cancelled by user");
        return await startOver();
    }

    log.info("Multiple options can be selected by pressing <space>. Press <a> to toggle all options.");
    const apiTypes = await multiselect({
        message: "Select API types.",
        options: [
            { value: ApiType.GET, label: "GET", hint: "Get data from server" },
            { value: ApiType.POST, label: "POST", hint: "Create data on server" },
            { value: ApiType.PUT, label: "PUT", hint: "Update data on server" },
            { value: ApiType.DELETE, label: "DELETE", hint: "Remove data from server" },
            { value: ApiType.PATCH, label: "PATCH", hint: "Update data on server" },
        ],
        required: false,
    });

    if (isCancel(apiTypes)) {
        cancel("Cancelled by user");
        return await startOver();
    }

    const socket = await confirm({
        message: "Do you want to use socket?",
    });

    if (isCancel(socket)) {
        cancel("Cancelled by user");
        return await startOver();
    }

    const database = await select({
        message: "Pick a database.",
        options: [
            { value: Database.Mongo, label: "MongoDB", hint: "Recommended for beginners" },
            { value: Database.Mysql, label: "MySQL", hint: "Recommended for production" },
            { value: Database.Postgres, label: "PostgreSQL", hint: "Recommended for production" },
            { value: Database.Sqlite, label: "SQLite", hint: "Recommended for testing" },
            { value: Database.Mssql, label: "MSSQL", hint: "Recommended for production" },
        ],
    });

    if (isCancel(database)) {
        cancel("Cancelled by user");
        return await startOver();
    }

    const swagger = await confirm({
        message: "Do you want to use swagger?",
    });

    if (isCancel(swagger)) {
        cancel("Cancelled by user");
        return await startOver();
    }

    const swaggerPath = swagger ? await text({
        message: "What is your swagger path?",
        placeholder: "/swagger",
        initialValue: "/swagger",
        validate: (value) => {
            if (value[0] !== '/') {
                return "Path must start with /";
            }
            const regex = /^\/[a-zA-Z0-9-_]+$/;
            if (!regex.test(value)) {
                return "Invalid path";
            }
        },
    }) : undefined;

    if (isCancel(swaggerPath)) {
        cancel("Cancelled by user");
        return await startOver();
    }


    const docker = await confirm({
        message: "Do you want to use docker?",
    });

    if (isCancel(docker)) {
        cancel("Cancelled by user");
        return await startOver();
    }

    note(
        "This tool will now install dependencies, configure your project, and do other fancy things.",
        "Press Ctrl+C to cancel."
    );

    return {
        projectName: projectName as string,
        installationType: installationType as InstallationType,
        projectType: projectType as ProjectType,
        apis: apiTypes as Apis[],
        socket: socket as boolean,
        database: database as Database,
        swagger: {
            enabled: swagger as boolean,
            path: swagger ? swaggerPath as string : undefined
        },
        docker: docker as boolean
    };
}

const startOver = async (): Promise<ProjectConfig | undefined> => {
    const shouldStartOver = await confirm({
        message: "Do you want to start over?",
    });

    if (isCancel(shouldStartOver)) {
        cancel("Cancelled by user");
        return await startOver();
    }

    if (shouldStartOver) {
        return await initPrompts();
    }

    note(
        "Thank you for using my CLI tool",
    );
}