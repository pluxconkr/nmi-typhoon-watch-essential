import { Link } from 'expo-router';

import { Body, Button } from '@/ui/primitives';
import { Screen } from '@/ui/Screen';

export default function NotFoundScreen() {
  return (
    <Screen title="Not found">
      <Body>That screen does not exist.</Body>
      <Link href="/" asChild>
        <Button title="Back to Alert tab" style={{ marginTop: 12 }} />
      </Link>
    </Screen>
  );
}
