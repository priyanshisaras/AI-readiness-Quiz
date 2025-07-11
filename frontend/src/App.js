import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Container, Typography, FormControl, InputLabel, Select, MenuItem,
  Button, Slider, Card, CardContent, RadioGroup, FormControlLabel,
  Radio, Checkbox, ListItemText, Chip, Box, CircularProgress
} from '@mui/material';
import { v4 as uuidv4 } from 'uuid';

const skills = [
  'Machine Learning (ML)',
  'Deep Learning (DL)',
  'Mathematics',
  'Data Science',
  'Generative AI (GenAI)',
  'Python Programming',
  'Python Libraries',
  'Ask Me Anything'
];

const getCorrectOption = (obfuscatedKey) => obfuscatedKey.charAt(9);

function App() {
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [difficulty, setDifficulty] = useState(5);
  const [question, setQuestion] = useState(null);
  const [selectedOption, setSelectedOption] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');

  useEffect(() => {
    setSessionId(uuidv4()); 
  }, []);

  const handleTopicChange = (event) => {
    const value = event.target.value;
    if (value.includes('Ask Me Anything')) {
      setSelectedTopics(skills);
    } else {
      const filtered = value.filter(topic => topic !== 'Ask Me Anything');
      setSelectedTopics(filtered);
    }
  };

  const handleDifficultyChange = (event, newValue) => {
    setDifficulty(newValue);
  };

  const generateQuestion = async () => {
    if (selectedTopics.length === 0) {
      alert('Please select at least one topic');
      return;
    }

    setIsLoading(true);
    setQuestion(null);
    setIsSubmitted(false);
    setSelectedOption('');

    try {
      const response = await axios.post('http://localhost:5000/api/generate-question', {
        topics: selectedTopics,
        difficulty,
        session_id: sessionId
      });
      setQuestion(response.data);
    } catch (error) {
      console.error('Error generating question:', error);
      alert('Failed to generate question. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
  };

  const handleNextQuestion = () => {
    generateQuestion();
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h3" align="center" gutterBottom>
        Quiz Generator
      </Typography>

      <Card sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Select Quiz Parameters
        </Typography>

        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Select Topics</InputLabel>
          <Select
            multiple
            value={selectedTopics}
            onChange={handleTopicChange}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip key={value} label={value} />
                ))}
              </Box>
            )}
          >
            {skills.map((skill) => (
              <MenuItem key={skill} value={skill}>
                <Checkbox checked={selectedTopics.indexOf(skill) > -1} />
                <ListItemText primary={skill} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Typography gutterBottom>
          Difficulty Level: {difficulty}
        </Typography>
        <Slider
          value={difficulty}
          onChange={handleDifficultyChange}
          min={1}
          max={10}
          step={1}
          marks
          valueLabelDisplay="auto"
          sx={{ mb: 3 }}
        />

        <Button
          variant="contained"
          color="primary"
          onClick={generateQuestion}
          disabled={isLoading}
          fullWidth
        >
          {isLoading ? <CircularProgress size={24} /> : 'Generate Question'}
        </Button>
      </Card>

      {question && (
        <Card sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Question
          </Typography>
          <Typography paragraph>{question.question}</Typography>

          <FormControl component="fieldset" fullWidth>
            <RadioGroup
              value={selectedOption}
              onChange={(e) => setSelectedOption(e.target.value)}
            >
              {Object.entries(question.options).map(([key, value]) => {
                const correctOption = getCorrectOption(question.obfuscated_key);
                return (
                  <FormControlLabel
                    key={key}
                    value={key}
                    control={<Radio />}
                    label={`${key}. ${value}`}
                    disabled={isSubmitted}
                    sx={{
                      mb: 1,
                      ...(isSubmitted && key === correctOption && {
                        bgcolor: 'success.light',
                        borderRadius: 1
                      }),
                      ...(isSubmitted && selectedOption === key && key !== correctOption && {
                        bgcolor: 'error.light',
                        borderRadius: 1
                      })
                    }}
                  />
                );
              })}
            </RadioGroup>
          </FormControl>

          {isSubmitted && (
            <CardContent sx={{ mt: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>
                Explanation:
              </Typography>
              <Typography>{question.explanation}</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Correct Option: <strong>{getCorrectOption(question.obfuscated_key)}</strong>
              </Typography>
            </CardContent>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            {!isSubmitted ? (
              <Button
                variant="contained"
                color="primary"
                onClick={handleSubmit}
                disabled={!selectedOption}
              >
                Submit Answer
              </Button>
            ) : (
              <Button
                variant="contained"
                color="primary"
                onClick={handleNextQuestion}
              >
                Next Question
              </Button>
            )}
          </Box>
        </Card>
      )}
    </Container>
  );
}

export default App;
