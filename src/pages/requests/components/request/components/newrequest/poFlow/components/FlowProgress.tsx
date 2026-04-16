import { Stepper } from "@mantine/core";

type Props = {
    activeStep: 0 | 1 | 2;
};

export default function FlowProgress({ activeStep }: Props) {
    return (
        <Stepper active={activeStep} radius="xl" size="sm">
            <Stepper.Step label="Template & Upload" description="Prepare your file" />
            <Stepper.Step label="Map Columns" description="Align data fields" />
            <Stepper.Step label="Preview & Confirm" description="Validate & submit" />
        </Stepper>
    );
}
