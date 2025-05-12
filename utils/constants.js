export const properties = {
    // Alignment
    items: "align-items",
    justify: "justify-content",
    self: "align-self",

    // Animation & transition
    animation: "animation",
    transform: "transform",
    scale: "transform",
    rotate: "transform",
    translate: "transform",
    transition: "transition",
    "transition-duration": "transition-duration",

    // Background
    bg: "background-color",
    "bg-color": "background-color",
    "bg-img": "background-image",
    "bg-linear": "background",
    "bg-pos": "background-position",
    "bg-radial": "background",
    "bg-rgb": "background-color",
    "bg-rgba": "background-color",
    "bg-size": "background-size",

    // Border
    border: "border",
    "border-b": "border-bottom",
    "border-l": "border-left",
    "border-r": "border-right",
    "border-style": "border-style",
    "border-t": "border-top",
    "border-w": "border-width",
    "border-col": "border-color",

    // Border radius
    rounded: "border-radius",
    "rounded-b": ["border-bottom-left-radius", "border-bottom-right-radius"],
    "rounded-bl": "border-bottom-left-radius",
    "rounded-br": "border-bottom-right-radius",
    "rounded-l": ["border-top-left-radius", "border-bottom-left-radius"],
    "rounded-r": ["border-top-right-radius", "border-bottom-right-radius"],
    "rounded-t": ["border-top-left-radius", "border-top-right-radius"],
    "rounded-tl": "border-top-left-radius",
    "rounded-tr": "border-top-right-radius",

    // Color & font
    c: "color",
    "c-rgb": "color",
    "c-rgba": "color",
    font: "font-family",
    "font-size": "font-size",
    "font-weight": "font-weight",
    fs: "font-size",
    fw: "font-weight",

    // Cursor
    cursor: "cursor",

    // Display & visibility
    d: "display",
    visible: "visibility",

    // Flex & grid
    flex: "flex",
    "flex-basis": "flex-basis",
    "flex-direction": "flex-direction",
    "flex-grow": "flex-grow",
    "flex-shrink": "flex-shrink",
    grid: "grid",
    "grid-cols": "grid-template-columns",
    "grid-rows": "grid-template-rows",
    "col-span": "grid-column",
    "row-span": "grid-row",

    // Gutter
    gutter: "gutter",
    "gutter-x": "gutter-x",
    "gutter-y": "gutter-y",

    // Layout
    h: "height",
    "max-h": "max-height",
    "min-h": "min-height",
    w: "width",
    "max-w": "max-width",
    "min-w": "min-width",

    // Margin
    m: "margin",
    mb: "margin-bottom",
    ml: "margin-left",
    mr: "margin-right",
    mt: "margin-top",
    mx: ["margin-left", "margin-right"],
    my: ["margin-top", "margin-bottom"],

    // Padding
    p: "padding",
    pb: "padding-bottom",
    pl: "padding-left",
    pr: "padding-right",
    pt: "padding-top",
    px: ["padding-left", "padding-right"],
    py: ["padding-top", "padding-bottom"],

    // Position
    pos: "position",
    top: "top",
    right: "right",
    bottom: "bottom",
    left: "left",
    z: "z-index",

    // Shadow & opacity
    shadow: "box-shadow",
    opacity: "opacity",

    // Spacing
    gap: "gap",
    "gap-x": "column-gap",
    "gap-y": "row-gap",

    // Text
    "letter-spacing": "letter-spacing",
    "line-h": "line-height",
    "text-align": "text-align",
    "text-dec": "text-decoration",
    "text-transform": "text-transform",
    "word-spacing": "word-spacing",

    // Outline
    outline: "outline",

    // Custom components / variables
    icon: "icon",
    "icon-size": "--icon-size",

    progress: "progress",
    "progress-value": "--progress-value",
    "progress-color": "--progress-color",
    "progress-bg": "--progress-background-color",
    "progress-height": "--progress-height",
    "progress-radius": "--progress-border-radius",

    // Grid column shortcut
    col: "grid-column",
};

export const breakpoints = {
    xs: "320px",
    sm: "576px",
    md: "768px",
    lg: "992px",
    xl: "1200px",
    xxl: "1400px",
};

export const containerMaxWidths = {
    sm: "540px",
    md: "720px",
    lg: "960px",
    xl: "1140px",
    xxl: "1320px",
};

export const CLASS_REGEX =
    /^(?:([a-zA-Z0-9-]+)---)?(?:(?:m--)?([a-z0-9]+(?:--[a-z0-9]+)*)--)?([a-z0-9-]+)-\[(.*?)\](?:-([a-z-_()\[\]]+(?:-[a-z-_()\[\]]+)*))?$/;

export const COLOR_REGEX = {
    HEX: /^[0-9A-Fa-f]{6}$/,
    RGB: /^(\d+)\s+(\d+)\s+(\d+)$/,
    RGBA: /^(\d+)\s+(\d+)\s+(\d+)\s+(\d+)$/,
};
