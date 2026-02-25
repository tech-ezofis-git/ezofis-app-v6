export const generateId = () => {
    try {
        return crypto.randomUUID()
    } catch (e) {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    }
}

export const getField = (fieldType: string) => {
    const id = generateId()
    
    const baseField = {
        id,
        label: fieldType.replace(/_/g, ' ').toLowerCase(),
        displayLabel: "",
        type: fieldType.toUpperCase(),
        settings: {
            general: {
                hideLabel: false,
                size: "col-12",
                visibility: "NORMAL",
                placeholder: "",
                tooltip: "",
                dividerType: "SOLID",
                url: ""
            },
            specific: {
                defaultValue: "CUSTOM",
                customDefaultValue: "",
                optionsType: "CUSTOM",
                customOptions: "Option 1,Option 2,Option 3",
                separateOptionsUsing: "COMMA",
                allowToAddNewOptions: false,
                optionsPerLine: 0,
                tableColumns: [],
                tableRowsType: "ON_DEMAND",
                matrixColumns: [],
                matrixRows: [],
                fibFields: [],
                autoGenerateValue: { prefix: "", suffix: "" }
            },
            validation: {
                fieldRule: "OPTIONAL",
                contentRule: "",
                minimum: "",
                maximum: "",
                allowedFileTypes: [],
                maxFileSize: 10
            },
            aiSettings: {
                validateTypeKeyword: "",
                formControlValidate: { masterFormId: 0, masterFormColumn: [] }
            },
            lookupSettings: {
                columnName: "",
                connectionId: 0
            }
        }
    }

    // Specific tweaks based on type
    switch (fieldType.toUpperCase()) {
        case 'TABLE':
        case 'DYNAMIC_TABLE':
            baseField.settings.specific.tableColumns = [
                { id: generateId(), name: 'Column 1', type: 'SHORT_TEXT', size: 'md' }
            ]
            break
        case 'MATRIX':
            baseField.settings.specific.matrixColumns = ['Col 1', 'Col 2']
            baseField.settings.specific.matrixRows = ['Row 1', 'Row 2']
            break
        case 'SINGLE_SELECT':
        case 'MULTI_SELECT':
        case 'SINGLE_CHOICE':
        case 'MULTIPLE_CHOICE':
            // Defaults are already set in specific block
            break
    }

    return baseField
}
