YUI_config = {
    filter: 'min',
    base: 'yui3/build/',
    root: 'yui3/build/',
    comboBase: '/combo?',
    combine: false,
    groups: {
        gallery: {
            base: 'yui3-gallery-2013.01.16-21-05/build/',
            root: 'yui3-gallery-2013.01.16-21-05/build/',
            comboBase: '/combo?',
            combine: false,
            patterns: {
                'gallery-': {},
                'gallerycss-': { type: 'css' }
            }
        }
    }
};
