-- Insert seed conversations
INSERT INTO conversations (id, title, created_at, updated_at) VALUES
('seed-1', 'React Performance Tips', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
('seed-2', 'CSS Grid vs Flexbox', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day');

-- Insert seed messages for React Performance Tips
INSERT INTO messages (id, conversation_id, role, content, liked, disliked, timestamp, created_at) VALUES
('m1', 'seed-1', 'user', 'What are some ways to optimize a React application?', FALSE, FALSE, '2:15 PM', NOW() - INTERVAL '2 hours' + INTERVAL '1 minute'),
('m2', 'seed-1', 'assistant', '# Optimizing React Performance

Here are some of the most effective strategies to make React apps faster:

1. **Prevent Unnecessary Re-renders**:
   - Use `React.memo()` for functional components.
   - Use `useCallback()` to memoize callback functions passed to children.
   - Use `useMemo()` to cache expensive calculations.

2. **Code Splitting & Lazy Loading**:
   - Use `React.lazy()` and `Suspense` to split bundles into chunks.
   ```javascript
   const HeavyComponent = React.lazy(() => import("./HeavyComponent"));
   ```

3. **Virtualize Long Lists**:
   - Use `react-window` or `react-virtualized` to only render items currently visible in the viewport.', FALSE, FALSE, '2:16 PM', NOW() - INTERVAL '2 hours' + INTERVAL '2 minutes');

-- Insert seed messages for CSS Grid vs Flexbox
INSERT INTO messages (id, conversation_id, role, content, liked, disliked, timestamp, created_at) VALUES
('m3', 'seed-2', 'user', 'When should I use CSS Grid versus Flexbox?', FALSE, FALSE, 'Yesterday', NOW() - INTERVAL '1 day' + INTERVAL '1 minute'),
('m4', 'seed-2', 'assistant', '# CSS Grid vs Flexbox

- **Flexbox** is designed for **one-dimensional** layouts — either a row *or* a column.
- **CSS Grid** is designed for **two-dimensional** layouts — rows *and* columns simultaneously.

### Use Flexbox when:
- You want to align inline items or distribute space.
- You don''t need a strict rows-and-columns design.
- You want elements to size themselves naturally.

### Use Grid when:
- You need to layout items in 2D (like a dashboard skeleton).
- You need precise control over row and column widths.', FALSE, FALSE, 'Yesterday', NOW() - INTERVAL '1 day' + INTERVAL '2 minutes');
