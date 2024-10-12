# node-server-init

![Node](https://img.shields.io/badge/-Node-339933?style=flat-square&logo=Node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/-TypeScript-007ACC?style=flat-square&logo=TypeScript&logoColor=white)
![Express](https://img.shields.io/badge/-Express-000000?style=flat-square&logo=Express&logoColor=white)
![Sequelize](https://img.shields.io/badge/-Sequelize-52B0E7?style=flat-square&logo=Sequelize&logoColor=white)
![MySQL](https://img.shields.io/badge/-MySQL-4479A1?style=flat-square&logo=MySQL&logoColor=white)
![PostgresSQL](https://img.shields.io/badge/-PostgreSQL-336791?style=flat-square&logo=PostgreSQL&logoColor=white)
![Sqlite](https://img.shields.io/badge/-Sqlite-003B57?style=flat-square&logo=Sqlite&logoColor=white)
![MariaDB](https://img.shields.io/badge/-MariaDB-003545?style=flat-square&logo=MariaDB&logoColor=white)
![MSSql](https://img.shields.io/badge/-MSSql-CC2927?style=flat-square&logo=Microsoft-SQL-Server&logoColor=white)
![DB2](https://img.shields.io/badge/-DB2-CC0000?style=flat-square&logo=IBM&logoColor=white)
![Snowflake](https://img.shields.io/badge/-Snowflake-00BFFF?style=flat-square&logo=Snowflake&logoColor=white)
![Oracle](https://img.shields.io/badge/-Oracle-F80000?style=flat-square&logo=Oracle&logoColor=white)
![Mongoose](https://img.shields.io/badge/-Mongoose-880000?style=flat-square&logo=Mongoose&logoColor=white)
![MongoDB](https://img.shields.io/badge/-MongoDB-47A248?style=flat-square&logo=MongoDB&logoColor=white)
![Validations](https://img.shields.io/badge/-Validations-FF0000?style=flat-square)
![Socket](https://img.shields.io/badge/-Socket-FF6900?style=flat-square&logo=Socket.io&logoColor=white)
![Docker](https://img.shields.io/badge/-Docker-2496ED?style=flat-square&logo=Docker&logoColor=white)
![Swagger](https://img.shields.io/badge/-Swagger-85EA2D?style=flat-square&logo=Swagger&logoColor=white)

Npm package for initializing Node.js server projects with customizable configurations.

## Installation

To use this package, initiate a Node.js server project with custom configurations using the following command:

```bash
npx node-server-init <folder-name>
```

## Usage

If you want to create a Node.js server project with name `my-server`, run the following command:

```bash
npx node-server-init my-server
```

If you want to use current directory as the project folder, run the following command:

```bash
npx node-server-init .
```

## Demo

https://github.com/Thre4dripper/node-server-init/assets/82382156/3eda5aac-ee8f-4ea3-82a1-176f00ee64db

## Features

This npm package provides a flexible setup for Node.js server projects with the following features:

- **Node.js, Express, TypeScript**: Utilizes a robust setup using Node.js, Express, and TypeScript.
- **Sequelize & Mongoose**: Integrations with Sequelize for SQL database operations and Mongoose for MongoDB.
- **Database Compatibility**: Allows interaction with various databases such as MySQL, PostgreSQL, MariaDB, Sqlite,
  MSSql, MongoDB.
- **Validation Mechanism**: Built-in validations for incoming request payloads.
- **Automated Swagger Documentation**: Automatically generated API documentation available at `/api-docs`.
- **Service-Based Architecture**: Employs a modular approach for better organization and scalability.
- **Socket Events**: Handles socket event management using Socket.io.
- **Dockerized Deployment**: Supports Docker for easy deployment.

## Project Structure

The project structure is as follows with all configurations:

```
my-server
└───src
    ├───app
    │   ├───apis
    │   │   └───user
    │   │       ├───controllers
    │   │       ├───repositories
    │   │       └───services
    │   ├───common
    │   ├───enums
    │   ├───handlers
    │   ├───models
    │   ├───routes
    │   └───utils
    └───config
```

## Implementation

Curious about the magic behind this package? 🌟
Wondering where all those files come from? 🧐

The secret sauce is the [NodeTs-Express-Service-Based-Template](https://github.com/Thre4dripper/NodeTs-Express-Service-Based-Template)!

> P. S. I made that too! 😄
