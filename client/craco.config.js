module.exports = {
  webpack: {
    configure: {
      ignoreWarnings: [
        {
          module: /html2pdf\.js/,
          message: /Failed to parse source map/,
        },
      ],
    },
  },
}; 