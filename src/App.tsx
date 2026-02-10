import JiraTicketCreator from './components/JiraTicketCreator';
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <JiraTicketCreator />
    </ThemeProvider>
  );
}

export default App;
