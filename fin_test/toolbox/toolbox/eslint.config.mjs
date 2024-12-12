/*
 * Project Name: Speech to Code
 * Author: STC Team
 * Date: 12/12/2024
 * Last Modified: 12/12/2024
 * Version: 1.0
 * Copyright (c) 2024 Brown University
 * All rights reserved.
 * This file is part of the STC project.
 * Usage of this file is restricted to the terms specified in the
 * accompanying LICENSE file.
 */

import globals from "globals";

export default [{
    files: ["**/*.js"],
    languageOptions: {
        globals: {
            ...globals.commonjs,
            ...globals.node,
            ...globals.mocha,
        },

        ecmaVersion: 2022,
        sourceType: "module",
    },

    rules: {
        "no-const-assign": "warn",
        "no-this-before-super": "warn",
        "no-undef": "warn",
        "no-unreachable": "warn",
        "no-unused-vars": "warn",
        "constructor-super": "warn",
        "valid-typeof": "warn",
    },
}];