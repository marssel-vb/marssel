// Importer et utiliser les helpers correctement
import { escapeValue } from "./helpers.js";
import { CLASS_REGEX } from "./constants.js";

export const buildFinalClassName = (
    breakpoints,
    property,
    value,
    pseudoModifiers
) => {
    const escapedValue = escapeValue(value);
    let className = `${property}-\\[${escapedValue}\\]`;

    if (breakpoints.length > 0) {
        className = `${breakpoints.join("--")}--${className}`;
    }

    if (pseudoModifiers) {
        className += `-${pseudoModifiers}`;
    }

    return className;
};

export const parseClassName = (className) => {
    const match = className.match(CLASS_REGEX);
    if (!match) return null;

    const [, component, breakpoints, property, value, pseudoModifiers] = match;
    const bpList = breakpoints ? breakpoints.split("--") : [];
    const escapedValue = escapeValue(value);

    return {
        component,
        breakpoints: bpList,
        property,
        value,
        pseudoModifiers,
        escapedValue,
        finalClassName: buildFinalClassName(
            bpList,
            property,
            value,
            pseudoModifiers
        ),
    };
};

export const parseClassPart = (component, styleClass) => {
    const partRegex =
        /^(?:(?:m--)?([a-z0-9]+(?:--[a-z0-9]+)*)--)?([a-z0-9-]+)-\[(.*?)\](?:-([a-z-_]+(?:-[a-z-_]+)*))?$/;
    const match = styleClass.match(partRegex);

    if (!match) return null;

    const [, breakpoints, property, value, pseudoModifiers] = match;

    const bpList = breakpoints ? breakpoints.split("--") : [];
    const escapedValue = escapeValue(value);

    return {
        component,
        breakpoints: bpList,
        property,
        value,
        pseudoModifiers,
        escapedValue,
        finalClassName: buildFinalClassName(
            bpList,
            property,
            value,
            pseudoModifiers
        ),
    };
};

export const parseGutterValue = (value) => {
    const match = value.match(/^([\d.]+)(px|em|rem|%|pc)$/);
    if (!match) return null;
    return parseFloat(match[1]) / 2 + match[2];
};
