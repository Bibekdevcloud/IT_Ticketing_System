import { render, screen } from "@testing-library/react";
import App from "../App";

test("renders app title", () => {
  render(<App />);
  // Adjust this text to something your UI always shows (like your APP name)
  expect(screen.getByText(/Internal IT Ticket System/i)).toBeInTheDocument();
});
