const config = {
    development: {
        apiBaseURL: "https://localhost:7016"
    },
    production: {
        apiBaseURL: `${window.location.protocol}//${window.location.host}`
    }
};

export const getConfig = () => {
    const env = import.meta.env.VITE_ENV || "development";
    return config[env];
};
