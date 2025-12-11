import {ContentLayout} from "@/components/layout/content-layout";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

export default function Page() {
    return (
        <ContentLayout title="Custom Claims">
            <Card>
                <CardContent className={"pt-6"}>
                    <CardTitle>placeholder</CardTitle>
                </CardContent>
            </Card>
        </ContentLayout>
    );
}
