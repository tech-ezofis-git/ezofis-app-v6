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
        label: fieldType.toLowerCase() === 'text_builder' ? 'Paragraph' : fieldType.replace(/_/g, ' ').toLowerCase(),
        displayLabel: "",
        type: fieldType.toUpperCase(),
        settings: {
            general: {
                hideLabel: false,
                size: "col-6",
                visibility: "NORMAL",
                placeholder: "",
                tooltip: "",
                url: ""
            },
            specific: {
                defaultValue: "CUSTOM",
                customDefaultValue: "",
                optionsType: "CUSTOM",
                optionsSource: "CUSTOM",
                customOptions: "Option 1,Option 2,Option 3",
                separateOptionsUsing: "COMMA",
                allowToAddNewOptions: false,
                optionsPerLine: 0,
                tableColumns: [] as any[],
                tableRowsType: "ON_DEMAND",
                matrixColumns: [] as any[],
                matrixRows: [] as any[],
                fibFields: [] as any[],
                dividerStyle: "SOLID",
                autoGenerateValue: { enabled: false, prefix: "", suffix: "" }
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
    const s = baseField.settings.specific as any
    switch (fieldType.toUpperCase()) {
        case 'TABLE':
        case 'DYNAMIC_TABLE':
            s.tableColumns = [
                { id: generateId(), label: 'Column 1', type: 'SHORT_TEXT', size: 'col-6' }
            ]
            break
        case 'MATRIX':
            s.matrixRowLabels = ['Row 1', 'Row 2']
            s.matrixColumnLabels = ['Col 1', 'Col 2', 'Col 3']
            break
        case 'RATING':
            s.iconType = 'STAR'
            s.iconCount = 5
            break
        case 'OPINION_SCALE':
            s.iconType = 'STAR'
            s.iconCount = 10
            break
    }

    return baseField
}
