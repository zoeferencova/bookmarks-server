require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const { NODE_ENV } = require('./config');
const errorHandler = require('./error-handler')
const validateBearerToken = require('./validate-token')
const bookmarksRouter = require('./bookmarks/bookmarks-router')

const app = express();

const morganOption = (NODE_ENV === 'production') ? 'tiny' : 'dev';

app.use(morgan(morganOption));
app.use(helmet());
app.use(cors());
app.use(express.json())

app.use(validateBearerToken)
app.use(bookmarksRouter)
app.use(errorHandler)

module.exports = app;