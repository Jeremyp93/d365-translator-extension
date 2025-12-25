import { Input, InputProps } from '@fluentui/react-components';

export default function TextInput(props: InputProps) {
  // value/onChange/placeholder map 1:1
  return <Input {...props} />;
}
