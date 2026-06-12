const express = require("express");
const axios = require("axios");
const collegesRouter = express.Router();

const COLLEGES_API_URL = "https://colleges-api-india.fly.dev";

// Search colleges by keyword
collegesRouter.post("/colleges/search", async (req, res) => {
  try {
    const { keyword } = req.body;

    if (!keyword || keyword.trim().length < 2) {
      return res.status(400).json({
        error: "Keyword must be at least 2 characters long",
      });
    }

    const response = await axios.post(
      `${COLLEGES_API_URL}/colleges/search`,
      {},
      {
        headers: {
          Keyword: keyword.trim(),
        },
        timeout: 10000, // 10 second timeout
      }
    );

    if (Array.isArray(response.data)) {
      // Format: [id, university, college, type, state, district]
      const formatted = response.data.slice(0, 10).map((college) => ({
        id: college[0],
        university: college[1],
        name: college[2],
        type: college[3],
        state: college[4],
        district: college[5],
        displayName: `${college[2]}${college[4] ? `, ${college[4]}` : ""}`,
      }));

      res.json({
        message: "Colleges fetched successfully",
        data: formatted,
      });
    } else {
      res.json({
        message: "No colleges found",
        data: [],
      });
    }
  } catch (error) {
    console.error("Error searching colleges:", error.message);
    
    if (error.code === "ECONNABORTED") {
      return res.status(504).json({
        error: "Request timeout. Please try again.",
      });
    }

    if (error.response) {
      return res.status(error.response.status || 500).json({
        error: error.response.data?.error || "Failed to search colleges",
      });
    }

    res.status(500).json({
      error: "Failed to search colleges. Please try again later.",
    });
  }
});

// Get all states
collegesRouter.get("/colleges/states", async (req, res) => {
  try {
    const response = await axios.post(
      `${COLLEGES_API_URL}/allstates`,
      {},
      {
        timeout: 10000,
      }
    );

    if (Array.isArray(response.data)) {
      res.json({
        message: "States fetched successfully",
        data: response.data,
      });
    } else {
      res.json({
        message: "No states found",
        data: [],
      });
    }
  } catch (error) {
    console.error("Error fetching states:", error.message);
    res.status(500).json({
      error: "Failed to fetch states. Please try again later.",
    });
  }
});

// Get districts in a state
collegesRouter.post("/colleges/districts", async (req, res) => {
  try {
    const { state } = req.body;

    if (!state || !state.trim()) {
      return res.status(400).json({
        error: "State is required",
      });
    }

    const response = await axios.post(
      `${COLLEGES_API_URL}/district`,
      {},
      {
        headers: {
          State: state.trim(),
        },
        timeout: 10000,
      }
    );

    if (Array.isArray(response.data)) {
      res.json({
        message: "Districts fetched successfully",
        data: response.data,
      });
    } else {
      res.json({
        message: "No districts found",
        data: [],
      });
    }
  } catch (error) {
    console.error("Error fetching districts:", error.message);
    res.status(500).json({
      error: "Failed to fetch districts. Please try again later.",
    });
  }
});

module.exports = collegesRouter;

